import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { view } from "../../src/commands/view.ts";
import {
	clearProjectRootCache,
	closeDatabase,
	type getDatabase,
	initDatabase,
} from "../../src/db/client.ts";
import { TaskType } from "../../src/models/task.ts";
import {
	captureConsole,
	createTestTask,
	createTestTaskHierarchy,
} from "../fixtures.ts";

describe("commands/view", () => {
	const testDir = join(import.meta.dir, "test-view-project");
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

	test("should show full task details", async () => {
		const task = createTestTask(db, {
			name: "Test Task",
			type: TaskType.TASK,
			priority: 2,
			description: "A test description",
		});

		const console = captureConsole();
		await view(task.hash_id, testDir);

		expect(console.output).toContain(task.hash_id);
		expect(console.output).toContain("Test Task");
		expect(console.output).toContain("TASK");
		expect(console.output).toContain("2");
		expect(console.output).toContain("A test description");
	});

	test("should show sub-tasks", async () => {
		const { childTask1 } = createTestTaskHierarchy(db);

		const console = captureConsole();
		await view(childTask1.hash_id, testDir);

		expect(console.output).toContain("Sub-tasks");
		expect(console.output).toContain("Grandchild Task");
	});

	test("should show task not found for invalid ID", async () => {
		const console = captureConsole();
		await view("nonexistent-id", testDir);

		expect(console.output).toContain("not found");
	});

	test("should parse task ID with suffix", async () => {
		const task = createTestTask(db, { name: "Test" });
		// Remove any existing tasks to ensure clean state
		// @ts-expect-error
		db.run("DELETE FROM tasks WHERE id != ?", task.id);

		// Create child
		const child = createTestTask(db, { name: "Child", parent_id: task.id });

		const console = captureConsole();
		// View parent with child suffix (like viewing from list)
		await view(`${task.hash_id}.1`, testDir);

		expect(console.output).toContain("Test");
	});

	test("should show multiple tasks", async () => {
		const task1 = createTestTask(db, { name: "Task One", type: TaskType.TASK });
		const task2 = createTestTask(db, { name: "Task Two", type: TaskType.EPIC });

		const console = captureConsole();
		await view([task1.hash_id, task2.hash_id], testDir);

		expect(console.output).toContain("Task One");
		expect(console.output).toContain("Task Two");
		expect(console.output).toContain("---"); // separator
	});

	test("should show multiple tasks with mixed valid and invalid IDs", async () => {
		const task1 = createTestTask(db, { name: "Valid Task" });

		const console = captureConsole();
		await view([task1.hash_id, "nonexistent-id"], testDir);

		expect(console.output).toContain("Valid Task");
		expect(console.output).toContain("not found");
	});
});
