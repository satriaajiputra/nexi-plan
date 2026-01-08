import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { work } from "../../src/commands/work.ts";
import {
	clearProjectRootCache,
	closeDatabase,
	type getDatabase,
	initDatabase,
} from "../../src/db/client.ts";
import { getTaskById } from "../../src/db/queries.ts";
import { TaskStatus } from "../../src/models/task.ts";
import { captureConsole, createTestTask } from "../fixtures.ts";

describe("commands/work", () => {
	const testDir = join(import.meta.dir, "test-work-project");
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

	test("should show task details and mark as in_progress", async () => {
		const task = createTestTask(db, {
			name: "Work Task",
			status: TaskStatus.PENDING,
		});

		const console = captureConsole();
		await work(task.hash_id, testDir);

		expect(console.output).toContain(task.hash_id);
		expect(console.output).toContain("Work Task");
		expect(console.output).toContain("in_progress");
	});

	test("should update status to in_progress", async () => {
		const task = createTestTask(db, {
			name: "Task",
			status: TaskStatus.PENDING,
		});

		await work(task.hash_id, testDir);

		const updated = getTaskById(db, task.hash_id)!;
		expect(updated.status).toBe(TaskStatus.IN_PROGRESS);
	});

	test("should show task not found for invalid ID", async () => {
		const console = captureConsole();
		await work("nonexistent-id", testDir);

		expect(console.output).toContain("not found");
	});
});
