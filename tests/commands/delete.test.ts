import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { deleteTask } from "../../src/commands/delete.ts";
import {
	clearProjectRootCache,
	closeDatabase,
	type getDatabase,
	initDatabase,
} from "../../src/db/client.ts";
import { getTaskById } from "../../src/db/queries.ts";
import {
	captureConsole,
	createTestTask,
	createTestTaskHierarchy,
} from "../fixtures.ts";

describe("commands/delete", () => {
	const testDir = join(import.meta.dir, "test-delete-project");
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

	test("should delete single task", async () => {
		const task = createTestTask(db, { name: "To Delete" });

		await deleteTask(task.hash_id, false, testDir);

		expect(getTaskById(db, task.hash_id)).toBeNull();
	});

	test("should show warning with child count", async () => {
		const { epic } = createTestTaskHierarchy(db);

		const console = captureConsole();
		await deleteTask(epic.hash_id, false, testDir);

		expect(console.output).toContain("will delete");
		expect(console.output).toContain("2 child");
	});

	test("should not delete when has children and not forced", async () => {
		const { epic } = createTestTaskHierarchy(db);

		await deleteTask(epic.hash_id, false, testDir);

		// Should not be deleted
		expect(getTaskById(db, epic.hash_id)).not.toBeNull();
	});

	test("should force delete task with children", async () => {
		const { epic } = createTestTaskHierarchy(db);

		await deleteTask(epic.hash_id, true, testDir);

		expect(getTaskById(db, epic.hash_id)).toBeNull();
	});

	test("should cascade delete all children", async () => {
		const { epic, childTask1, childTask2 } = createTestTaskHierarchy(db);

		await deleteTask(epic.hash_id, true, testDir);

		expect(getTaskById(db, epic.hash_id)).toBeNull();
		expect(getTaskById(db, childTask1.hash_id)).toBeNull();
		expect(getTaskById(db, childTask2.hash_id)).toBeNull();
	});

	test("should show task not found for invalid ID", async () => {
		const console = captureConsole();
		await deleteTask("nonexistent-id", false, testDir);

		expect(console.output).toContain("not found");
	});

	test("should show success message with child count", async () => {
		const { epic } = createTestTaskHierarchy(db);

		const console = captureConsole();
		await deleteTask(epic.hash_id, true, testDir);

		expect(console.output).toContain("Deleted task");
		expect(console.output).toContain("2 child");
	});
});
