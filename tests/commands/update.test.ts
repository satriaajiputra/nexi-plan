import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { updateTask } from "../../src/commands/update.ts";
import {
	clearProjectRootCache,
	closeDatabase,
	getDatabase,
	initDatabase,
} from "../../src/db/client.ts";
import { getTaskById } from "../../src/db/queries.ts";
import { TaskStatus } from "../../src/models/task.ts";
import { captureConsole, createTestTask, createTestTaskHierarchy } from "../fixtures.ts";

describe("commands/update", () => {
	const testDir = join(import.meta.dir, "test-update-project");
	const originalCwd = process.cwd();
	let db: ReturnType<typeof getDatabase>;

	beforeEach(() => {
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true });
		}
		mkdirSync(testDir, { recursive: true });
		mkdirSync(join(testDir, ".plan"), { recursive: true });
		db = initDatabase(join(testDir, ".plan", "tasks.db"));
		process.chdir(testDir);
		clearProjectRootCache();
	});

	afterEach(() => {
		closeDatabase(db);
		clearProjectRootCache();
		process.chdir(originalCwd);
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true });
		}
	});

	test("should update status to blocked", async () => {
		const task = createTestTask(db, {
			name: "Task",
			status: null,
		});

		await updateTask(task.hash_id, {
			status: TaskStatus.BLOCKED,
			cwd: testDir,
		});

		const updated = getTaskById(db, task.hash_id)!;
		expect(updated.status).toBe(TaskStatus.BLOCKED);
	});

	test("should update status to cancelled", async () => {
		const task = createTestTask(db, {
			name: "Task",
			status: null,
		});

		await updateTask(task.hash_id, {
			status: TaskStatus.CANCELLED,
			cwd: testDir,
		});

		const updated = getTaskById(db, task.hash_id)!;
		expect(updated.status).toBe(TaskStatus.CANCELLED);
	});

	test("should update convergence", async () => {
		const task = createTestTask(db, { name: "Task", convergence: 1.0 });

		await updateTask(task.hash_id, { convergence: 0.5, cwd: testDir });

		const updated = getTaskById(db, task.hash_id)!;
		expect(updated.convergence).toBe(0.5);
	});

	test("should snap convergence to zero when near zero", async () => {
		const task = createTestTask(db, { name: "Task", convergence: 0.005 });

		await updateTask(task.hash_id, { convergence: 0.005, cwd: testDir });

		const updated = getTaskById(db, task.hash_id)!;
		expect(updated.convergence).toBe(0);
	});

	test("should update description", async () => {
		const task = createTestTask(db, { name: "Task" });

		await updateTask(task.hash_id, {
			description: "New description",
			cwd: testDir,
		});

		const updated = getTaskById(db, task.hash_id)!;
		expect(updated.description).toBe("New description");
	});

	test("should read description from file", async () => {
		const task = createTestTask(db, { name: "Task" });
		const descFile = join(testDir, "description.md");
		writeFileSync(descFile, "File content");

		await updateTask(task.hash_id, {
			description: `@${descFile}`,
			cwd: testDir,
		});

		const updated = getTaskById(db, task.hash_id)!;
		expect(updated.description).toBe("File content");
	});

	test("should show task not found for invalid ID", async () => {
		const console = captureConsole();
		await updateTask("nonexistent", {
			status: TaskStatus.BLOCKED,
			cwd: testDir,
		});

		expect(console.output).toContain("not found");
	});

	test("should update multiple fields at once", async () => {
		const task = createTestTask(db, {
			name: "Task",
			status: null,
			convergence: 1.0,
			description: "Old",
		});

		await updateTask(task.hash_id, {
			status: TaskStatus.BLOCKED,
			convergence: 0.0,
			description: "New",
			cwd: testDir,
		});

		const updated = getTaskById(db, task.hash_id)!;
		expect(updated.status).toBe(TaskStatus.BLOCKED);
		expect(updated.convergence).toBe(0.0);
		expect(updated.description).toBe("New");
	});

	describe("convergence cascade to children", () => {
		test("should show warning when setting convergence to 1.0 with children", async () => {
			const { epic } = createTestTaskHierarchy(db);

			const console = captureConsole();
			await updateTask(epic.hash_id, { convergence: 1.0, cwd: testDir });

			expect(console.output).toContain("will set convergence to 1.0");
			expect(console.output).toContain("2 descendant"); // countChildren only counts direct children
		});

		test("should not update when has children and not forced", async () => {
			const { epic, childTask1, childTask2 } = createTestTaskHierarchy(db);

			// Set parent to 0.0 first so we can verify it doesn't change
			await updateTask(epic.hash_id, { convergence: 0.0, cwd: testDir });

			// Now try to set to 1.0 without force - should not update
			await updateTask(epic.hash_id, { convergence: 1.0, cwd: testDir });

			// Parent should still have 0.0
			const updated = getTaskById(db, epic.hash_id)!;
			expect(updated.convergence).toBe(0.0);

			// Children should not be affected
			const child1 = getTaskById(db, childTask1.hash_id)!;
			expect(child1.convergence).toBe(0.5); // Original value
			const child2 = getTaskById(db, childTask2.hash_id)!;
			expect(child2.convergence).toBe(1.0); // Original value
		});

		test("should force update convergence to 1.0 for task and direct children", async () => {
			const { epic, childTask1, childTask2 } = createTestTaskHierarchy(db);

			await updateTask(epic.hash_id, { convergence: 1.0, force: true, cwd: testDir });

			// Parent should be updated
			const parent = getTaskById(db, epic.hash_id)!;
			expect(parent.convergence).toBe(1.0);

			// Direct children should be updated
			const child1 = getTaskById(db, childTask1.hash_id)!;
			expect(child1.convergence).toBe(1.0);

			const child2 = getTaskById(db, childTask2.hash_id)!;
			expect(child2.convergence).toBe(1.0);
		});

		test("should cascade convergence to all nested descendants", async () => {
			const { epic, childTask1, childTask2, grandchild } = createTestTaskHierarchy(db);

			await updateTask(epic.hash_id, { convergence: 1.0, force: true, cwd: testDir });

			// All tasks should be updated including grandchild
			const parent = getTaskById(db, epic.hash_id)!;
			expect(parent.convergence).toBe(1.0);

			const child1 = getTaskById(db, childTask1.hash_id)!;
			expect(child1.convergence).toBe(1.0);

			const child2 = getTaskById(db, childTask2.hash_id)!;
			expect(child2.convergence).toBe(1.0);

			const grandchildTask = getTaskById(db, grandchild.hash_id)!;
			expect(grandchildTask.convergence).toBe(1.0);
		});

		test("should show success message with descendant count", async () => {
			const { epic } = createTestTaskHierarchy(db);

			const console = captureConsole();
			await updateTask(epic.hash_id, { convergence: 1.0, force: true, cwd: testDir });

			expect(console.output).toContain("Set convergence to 1.0");
			expect(console.output).toContain("2 descendant"); // countChildren only counts direct children
		});

		test("should not warn when setting convergence to 1.0 without children", async () => {
			const task = createTestTask(db, { name: "Leaf Task", convergence: 0.5 });

			const console = captureConsole();
			await updateTask(task.hash_id, { convergence: 1.0, cwd: testDir });

			expect(console.output).not.toContain("will set convergence to 1.0");
			const updated = getTaskById(db, task.hash_id)!;
			expect(updated.convergence).toBe(1.0);
		});
	});
});
