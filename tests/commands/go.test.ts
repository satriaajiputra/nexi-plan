import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { go } from "../../src/commands/go.ts";
import {
	clearProjectRootCache,
	closeDatabase,
	type getDatabase,
	initDatabase,
} from "../../src/db/client.ts";
import { getTaskById } from "../../src/db/queries.ts";
import { TaskStatus } from "../../src/models/task.ts";
import { captureConsole, createTestTask } from "../fixtures.ts";

describe("commands/go", () => {
	const testDir = join(import.meta.dir, "test-go-project");
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

	test("should find task by exact ID and mark as in_progress", async () => {
		const task = createTestTask(db, {
			name: "Target Task",
			status: TaskStatus.PENDING,
		});

		const console = captureConsole();
		await go(task.hash_id, testDir);

		expect(console.output).toContain("Target Task");
		expect(console.output).toContain("in_progress");
	});

	test("should fallback to fuzzy search", async () => {
		createTestTask(db, { name: "Login feature" });
		createTestTask(db, { name: "Dashboard" });

		const console = captureConsole();
		await go("login", testDir);

		expect(console.output).toContain("Login feature");
	});

	test("should mark found task as in_progress", async () => {
		const task = createTestTask(db, {
			name: "Search task",
			status: TaskStatus.PENDING,
		});

		await go("search", testDir);

		const updated = getTaskById(db, task.hash_id)!;
		expect(updated.status).toBe(TaskStatus.IN_PROGRESS);
	});

	test("should show message for no matches", async () => {
		createTestTask(db, { name: "Some task" });

		const console = captureConsole();
		await go("nonexistentxyz123", testDir);

		expect(console.output).toContain("No tasks found");
		expect(console.output).toContain("nonexistentxyz123");
	});

	test("should handle task ID prefix match", async () => {
		const task = createTestTask(db, { name: "Task" });

		const console = captureConsole();
		// Go with just the hash prefix
		await go(task.hash_id.substring(0, 5), testDir);

		expect(console.output).toContain("Task");
	});
});
