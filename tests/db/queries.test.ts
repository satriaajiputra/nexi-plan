import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
	countChildren,
	deleteTask,
	getAllTasks,
	getChildTasks,
	getRootTasks,
	getTaskById,
	getTaskByInternalId,
	getTasksByFilter,
	insertTask,
	searchTasks,
	updateTask,
} from "../../src/db/queries.ts";
import { TaskStatus, TaskType } from "../../src/models/task.ts";
import {
	cleanupTestDb,
	createStatusTestTasks,
	createTestDb,
	createTestTask,
	createTestTaskHierarchy,
	createTypeTestTasks,
} from "../fixtures.ts";

describe("db/queries", () => {
	let db: ReturnType<typeof createTestDb>;

	beforeEach(() => {
		db = createTestDb();
	});

	afterEach(() => {
		cleanupTestDb(db);
	});

	describe("insertTask", () => {
		test("should insert task with all fields", () => {
			const task = insertTask(db, {
				hash_id: "test-123",
				name: "Test Task",
				type: TaskType.TASK,
				priority: 3,
				description: "A test description",
				parent_id: undefined,
			});

			expect(task.hash_id).toBe("test-123");
			expect(task.name).toBe("Test Task");
			expect(task.type).toBe(TaskType.TASK);
			expect(task.priority).toBe(3);
			expect(task.status).toBeNull();
			expect(task.convergence).toBe(1.0);
			expect(task.description).toBe("A test description");
		});

		test("should auto-generate hash_id if not provided", () => {
			const task = insertTask(db, {
				hash_id: "auto-123",
				name: "Auto ID Task",
				type: TaskType.TASK,
				priority: 3,
			});

			expect(task.hash_id).toBe("auto-123");
		});

		test("should set parent_id when provided", () => {
			const parent = createTestTask(db, { name: "Parent" });
			const child = insertTask(db, {
				hash_id: "child-123",
				name: "Child Task",
				type: TaskType.TASK,
				priority: 3,
				parent_id: parent.id,
			});

			expect(child.parent_id).toBe(parent.id);
		});
	});

	describe("getTaskById", () => {
		test("should return task by hash_id", () => {
			const created = createTestTask(db, {
				name: "Test Task",
				hash_id: "find-me",
			});
			const found = getTaskById(db, "find-me");

			expect(found).not.toBeNull();
			expect(found!.name).toBe("Test Task");
		});

		test("should return null for non-existent hash_id", () => {
			const result = getTaskById(db, "nonexistent");
			expect(result).toBeNull();
		});
	});

	describe("getTaskByInternalId", () => {
		test("should return task by internal id", () => {
			const created = createTestTask(db, { name: "Test Task" });
			const found = getTaskByInternalId(db, created.id);

			expect(found).not.toBeNull();
			expect(found!.name).toBe("Test Task");
		});

		test("should return null for non-existent id", () => {
			const result = getTaskByInternalId(db, 9999);
			expect(result).toBeNull();
		});
	});

	describe("getAllTasks", () => {
		test("should return all tasks ordered by priority", () => {
			createTestTask(db, { name: "P3", priority: 3 });
			createTestTask(db, { name: "P1", priority: 1 });
			createTestTask(db, { name: "P2", priority: 2 });

			const tasks = getAllTasks(db);

			expect(tasks).toHaveLength(3);
			expect(tasks[0]!.name).toBe("P1");
			expect(tasks[1]!.name).toBe("P2");
			expect(tasks[2]!.name).toBe("P3");
		});
	});

	describe("getTasksByFilter", () => {
		test("should filter by status", () => {
			createStatusTestTasks(db);
			const blocked = getTasksByFilter(db, { status: TaskStatus.BLOCKED });

			expect(blocked.length).toBeGreaterThan(0);
			expect(blocked.every((t) => t.status === "blocked")).toBe(true);
		});

		test("should filter by type", () => {
			createTypeTestTasks(db);
			const epics = getTasksByFilter(db, { type: TaskType.EPIC });

			expect(epics.length).toBeGreaterThan(0);
			expect(epics.every((t) => t.type === "epic")).toBe(true);
		});

		test("should filter by parent_id", () => {
			const { epic } = createTestTaskHierarchy(db);

			const children = getTasksByFilter(db, { parent_id: epic.id });

			expect(children.length).toBeGreaterThan(0);
			expect(children.every((t) => t.parent_id === epic.id)).toBe(true);
		});

		test("should filter by parent_id null for root tasks", () => {
			createTaskHierarchy(db);
			const roots = getTasksByFilter(db, { parent_id: null });

			expect(roots.length).toBeGreaterThan(0);
			expect(roots.every((t) => t.parent_id === null)).toBe(true);
		});

		test("should exclude multiple statuses", () => {
			createStatusTestTasks(db);
			const available = getTasksByFilter(db, {
				excludeStatus: [TaskStatus.BLOCKED, TaskStatus.CANCELLED],
			});

			expect(
				available.every(
					(t) => t.status !== "blocked" && t.status !== "cancelled",
				),
			).toBe(true);
		});
	});

	describe("getChildTasks", () => {
		test("should return direct children of task", () => {
			const { epic, childTask1 } = createTestTaskHierarchy(db);

			const children = getChildTasks(db, epic.id);

			expect(children.length).toBe(2);
			expect(children.some((c) => c.id === childTask1.id)).toBe(true);
		});

		test("should return empty array for task with no children", () => {
			const task = createTestTask(db, { name: "Leaf" });

			const children = getChildTasks(db, task.id);

			expect(children).toHaveLength(0);
		});
	});

	describe("updateTask", () => {
		test("should update status to blocked", () => {
			const task = createTestTask(db, {
				name: "Test",
			});

			const updated = updateTask(db, task.hash_id, {
				status: TaskStatus.BLOCKED,
			});

			expect(updated!.status).toBe(TaskStatus.BLOCKED);
		});

		test("should update convergence", () => {
			const task = createTestTask(db, { name: "Test", convergence: 1.0 });

			const updated = updateTask(db, task.hash_id, { convergence: 0.5 });

			expect(updated!.convergence).toBe(0.5);
		});

		test("should update description", () => {
			const task = createTestTask(db, { name: "Test" });

			const updated = updateTask(db, task.hash_id, {
				description: "New description",
			});

			expect(updated!.description).toBe("New description");
		});

		test("should update multiple fields at once", () => {
			const task = createTestTask(db, {
				name: "Test",
			});

			const updated = updateTask(db, task.hash_id, {
				status: TaskStatus.BLOCKED,
				convergence: 0.0,
				description: "Blocked",
			});

			expect(updated!.status).toBe(TaskStatus.BLOCKED);
			expect(updated!.convergence).toBe(0.0);
			expect(updated!.description).toBe("Blocked");
		});

		test("should return original task if no updates", () => {
			const task = createTestTask(db, { name: "Test" });

			const updated = updateTask(db, task.hash_id, {});

			expect(updated!.name).toBe(task.name);
		});

		test("should return null for non-existent task", () => {
			const result = updateTask(db, "nonexistent", {
				status: TaskStatus.BLOCKED,
			});
			expect(result).toBeNull();
		});
	});

	describe("deleteTask", () => {
		test("should delete task", () => {
			const task = createTestTask(db, { name: "To Delete" });

			const result = deleteTask(db, task.hash_id);
			expect(result).toBe(true);

			const found = getTaskById(db, task.hash_id);
			expect(found).toBeNull();
		});

		test("should return false for non-existent task", () => {
			const result = deleteTask(db, "nonexistent");
			expect(result).toBe(false);
		});

		test("should cascade delete children", () => {
			const { epic, childTask1, childTask2 } = createTestTaskHierarchy(db);

			const result = deleteTask(db, epic.hash_id);
			expect(result).toBe(true);

			expect(getTaskById(db, epic.hash_id)).toBeNull();
			expect(getTaskById(db, childTask1.hash_id)).toBeNull();
			expect(getTaskById(db, childTask2.hash_id)).toBeNull();
		});
	});

	describe("countChildren", () => {
		test("should return correct child count", () => {
			const { epic } = createTestTaskHierarchy(db);

			const count = countChildren(db, epic.id);

			expect(count).toBe(2);
		});

		test("should return 0 for task with no children", () => {
			const task = createTestTask(db, { name: "Leaf" });

			const count = countChildren(db, task.id);

			expect(count).toBe(0);
		});
	});

	describe("searchTasks", () => {
		test("should find tasks by name", () => {
			createTestTask(db, { name: "Login feature" });
			createTestTask(db, { name: "Logout feature" });
			createTestTask(db, { name: "Dashboard" });

			const results = searchTasks(db, "login");

			expect(results.length).toBe(1);
			expect(results[0]!.name).toBe("Login feature");
		});

		test("should find tasks by description", () => {
			createTestTask(db, {
				name: "Task One",
				description: "Contains search term",
			});
			createTestTask(db, { name: "Task Two", description: "Different text" });

			const results = searchTasks(db, "search");

			expect(results.length).toBe(1);
			expect(results[0]!.name).toBe("Task One");
		});

		test("should return empty array for no matches", () => {
			createTestTask(db, { name: "Some task" });

			const results = searchTasks(db, "nonexistent");

			expect(results).toHaveLength(0);
		});
	});

	describe("getRootTasks", () => {
		test("should return only tasks without parent", () => {
			createTestTaskHierarchy(db);

			const roots = getRootTasks(db);

			expect(roots.length).toBe(1);
			expect(roots[0]!.parent_id).toBeNull();
		});
	});

	// Helper function
	function createTaskHierarchy(db: any) {
		const epic = createTestTask(db, { name: "Epic", type: TaskType.EPIC });
		createTestTask(db, { name: "Child", parent_id: epic.id });
	}
});
