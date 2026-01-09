import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { block } from "../../src/commands/block.ts";
import {
	clearProjectRootCache,
	closeDatabase,
	type getDatabase,
	initDatabase,
} from "../../src/db/client.ts";
import { getTaskById } from "../../src/db/queries.ts";
import { TaskStatus } from "../../src/models/task.ts";
import { captureConsole, createTestTask } from "../fixtures.ts";

describe("commands/status", () => {
	const testDir = join(import.meta.dir, "test-status-project");
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

	describe("block", () => {
		test("should set status to blocked", async () => {
			const task = createTestTask(db, {
				name: "Task",
				status: null,
			});

			await block(task.hash_id, testDir);

			const updated = getTaskById(db, task.hash_id)!;
			expect(updated.status).toBe(TaskStatus.BLOCKED);
		});

		test("should show task not found for invalid ID", async () => {
			const console = captureConsole();
			await block("nonexistent-id", testDir);

			expect(console.output).toContain("not found");
		});
	});
});
