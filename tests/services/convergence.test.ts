import { beforeEach, describe, expect, test } from "bun:test";
import { TaskStatus, TaskType } from "../../src/models/task.ts";
import {
	calculateParentConvergence,
	getWeight,
	isLeafTask,
	propagateConvergence,
	recalculateTreeConvergence,
} from "../../src/services/convergence.ts";
import {
	cleanupTestDb,
	createTestDb,
	createTestTask,
	createTestTaskHierarchy,
} from "../fixtures.ts";

describe("services/convergence", () => {
	describe("calculateParentConvergence", () => {
		test("should return 0 for task with no children", () => {
			const db = createTestDb();
			const task = createTestTask(db, { name: "Task", type: TaskType.TASK });

			const result = calculateParentConvergence(db, task.id);
			expect(result).toBe(0);

			cleanupTestDb(db);
		});

		test("should calculate weighted average of children", () => {
			const db = createTestDb();
			const parent = createTestTask(db, {
				name: "Parent",
				type: TaskType.EPIC,
			});
			createTestTask(db, {
				name: "Child 1",
				type: TaskType.TASK,
				parent_id: parent.id,
				convergence: 0.5,
			});
			createTestTask(db, {
				name: "Child 2",
				type: TaskType.TASK,
				parent_id: parent.id,
				convergence: 1.0,
			});

			const result = calculateParentConvergence(db, parent.id);
			// (0.5 + 1.0) / 2 = 0.75
			expect(result).toBe(0.75);

			cleanupTestDb(db);
		});

		test("should exclude cancelled tasks from calculation", () => {
			const db = createTestDb();
			const parent = createTestTask(db, {
				name: "Parent",
				type: TaskType.EPIC,
			});
			createTestTask(db, {
				name: "Active",
				type: TaskType.TASK,
				parent_id: parent.id,
				convergence: 0.5,
				status: null,
			});
			createTestTask(db, {
				name: "Cancelled",
				type: TaskType.TASK,
				parent_id: parent.id,
				convergence: 0.0,
				status: TaskStatus.CANCELLED,
			});

			const result = calculateParentConvergence(db, parent.id);
			// Only active child is considered: 0.5
			expect(result).toBe(0.5);

			cleanupTestDb(db);
		});

		test("should use weights based on task type", () => {
			const db = createTestDb();
			const parent = createTestTask(db, {
				name: "Parent",
				type: TaskType.EPIC,
			});
			// Epic weight = 1.0, Task weight = 2.0, Bug weight = 3.0
			createTestTask(db, {
				name: "Epic Child",
				type: TaskType.EPIC,
				parent_id: parent.id,
				convergence: 0.0,
			});
			createTestTask(db, {
				name: "Task Child",
				type: TaskType.TASK,
				parent_id: parent.id,
				convergence: 1.0,
			});

			const result = calculateParentConvergence(db, parent.id);
			// (0.0 * 1.0 + 1.0 * 2.0) / (1.0 + 2.0) = 2.0 / 3.0 ≈ 0.67
			expect(result).toBeCloseTo(0.67, 2);

			cleanupTestDb(db);
		});

		test("should return 0 when all children are cancelled", () => {
			const db = createTestDb();
			const parent = createTestTask(db, {
				name: "Parent",
				type: TaskType.EPIC,
			});
			createTestTask(db, {
				name: "Child",
				type: TaskType.TASK,
				parent_id: parent.id,
				convergence: 0.5,
				status: TaskStatus.CANCELLED,
			});

			const result = calculateParentConvergence(db, parent.id);
			expect(result).toBe(0);

			cleanupTestDb(db);
		});
	});

	describe("getWeight", () => {
		test("should return 1.0 for epic", () => {
			expect(getWeight(TaskType.EPIC)).toBe(1.0);
		});

		test("should return 2.0 for task", () => {
			expect(getWeight(TaskType.TASK)).toBe(2.0);
		});

		test("should return 3.0 for bug", () => {
			expect(getWeight(TaskType.BUG)).toBe(3.0);
		});
	});

	describe("isLeafTask", () => {
		test("should return true for task with no children", () => {
			const db = createTestDb();
			const task = createTestTask(db, { name: "Leaf" });

			expect(isLeafTask(db, task.id)).toBe(true);

			cleanupTestDb(db);
		});

		test("should return false for task with children", () => {
			const db = createTestDb();
			const parent = createTestTask(db, { name: "Parent" });
			createTestTask(db, { name: "Child", parent_id: parent.id });

			expect(isLeafTask(db, parent.id)).toBe(false);

			cleanupTestDb(db);
		});
	});

	describe("propagateConvergence", () => {
		test("should update parent convergence when child changes", () => {
			const db = createTestDb();
			const { epic } = createTestTaskHierarchy(db);

			// Update child convergence
			const child = createTestTask(db, {
				name: "New Child",
				type: TaskType.TASK,
				parent_id: epic.id,
				convergence: 0.0,
			});
			propagateConvergence(db, child.id);

			// Verify parent convergence updated
			const updated = db
				.query("SELECT * FROM tasks WHERE hash_id = ?")
				.get(epic.hash_id) as any;
			// childTask1: task(0.5) + childTask2: bug(1.0) + New Child: task(0.0) weighted by type
			// (0.5*2 + 1.0*3 + 0.0*2) / (2+3+2) = 4/7
			expect(updated.convergence).toBeCloseTo(0.571, 2);

			cleanupTestDb(db);
		});

		test("should propagate through multiple levels", () => {
			const db = createTestDb();
			const { epic, childTask1, childTask2 } = createTestTaskHierarchy(db);

			// Create grandchild under childTask1
			const grandchild = createTestTask(db, {
				name: "Grandchild",
				type: TaskType.TASK,
				parent_id: childTask1.id,
				convergence: 0.0,
			});

			propagateConvergence(db, grandchild.id);

			// Verify childTask1 updated
			const updatedChild1 = db
				.query("SELECT * FROM tasks WHERE id = ?")
				.get(childTask1.id) as any;
			expect(updatedChild1.convergence).toBe(0);

			// Verify epic updated
			const updatedEpic = db
				.query("SELECT * FROM tasks WHERE id = ?")
				.get(epic.id) as any;
			expect(updatedEpic.convergence).toBeLessThan(1);

			cleanupTestDb(db);
		});
	});

	describe("recalculateTreeConvergence", () => {
		test("should recalculate parent from children", () => {
			const db = createTestDb();
			const { epic } = createTestTaskHierarchy(db);

			// Manually set epic convergence
			db.query("UPDATE tasks SET convergence = 1.0 WHERE hash_id = ?").run(
				epic.hash_id,
			);

			recalculateTreeConvergence(db, epic.id);

			const updated = db
				.query("SELECT * FROM tasks WHERE hash_id = ?")
				.get(epic.hash_id) as any;
			expect(updated.convergence).toBeLessThan(1);

			cleanupTestDb(db);
		});

		test("should not affect leaf tasks", () => {
			const db = createTestDb();
			const leaf = createTestTask(db, { name: "Leaf", convergence: 0.5 });

			recalculateTreeConvergence(db, leaf.id);

			const updated = db
				.query("SELECT * FROM tasks WHERE hash_id = ?")
				.get(leaf.hash_id) as any;
			expect(updated.convergence).toBe(0.5);

			cleanupTestDb(db);
		});
	});
});
