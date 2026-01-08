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
import { captureConsole, createTestTask } from "../fixtures.ts";

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

	test("should update status to completed", async () => {
		const task = createTestTask(db, {
			name: "Task",
			status: TaskStatus.PENDING,
		});

		await updateTask(task.hash_id, {
			status: TaskStatus.COMPLETED,
			cwd: testDir,
		});

		const updated = getTaskById(db, task.hash_id)!;
		expect(updated.status).toBe(TaskStatus.COMPLETED);
	});

	test("should update status to in_progress", async () => {
		const task = createTestTask(db, {
			name: "Task",
			status: TaskStatus.PENDING,
		});

		await updateTask(task.hash_id, {
			status: TaskStatus.IN_PROGRESS,
			cwd: testDir,
		});

		const updated = getTaskById(db, task.hash_id)!;
		expect(updated.status).toBe(TaskStatus.IN_PROGRESS);
	});

	test("should update status to blocked", async () => {
		const task = createTestTask(db, {
			name: "Task",
			status: TaskStatus.PENDING,
		});

		await updateTask(task.hash_id, {
			status: TaskStatus.BLOCKED,
			cwd: testDir,
		});

		const updated = getTaskById(db, task.hash_id)!;
		expect(updated.status).toBe(TaskStatus.BLOCKED);
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
			status: TaskStatus.COMPLETED,
			cwd: testDir,
		});

		expect(console.output).toContain("not found");
	});

	test("should update multiple fields at once", async () => {
		const task = createTestTask(db, {
			name: "Task",
			status: TaskStatus.PENDING,
			convergence: 1.0,
			description: "Old",
		});

		await updateTask(task.hash_id, {
			status: TaskStatus.COMPLETED,
			convergence: 0.0,
			description: "New",
			cwd: testDir,
		});

		const updated = getTaskById(db, task.hash_id)!;
		expect(updated.status).toBe(TaskStatus.COMPLETED);
		expect(updated.convergence).toBe(0.0);
		expect(updated.description).toBe("New");
	});
});
