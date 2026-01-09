import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { list } from "../../src/commands/list.ts";
import {
	clearProjectRootCache,
	closeDatabase,
	type getDatabase,
	initDatabase,
} from "../../src/db/client.ts";
import { TaskStatus, TaskType } from "../../src/models/task.ts";
import {
	captureConsole,
	createStatusTestTasks,
	createTestTask,
	createTypeTestTasks,
} from "../fixtures.ts";

describe("commands/list", () => {
	const testDir = join(import.meta.dir, "test-list-project");
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

	test("should show all tasks in tree view", async () => {
		createTestTask(db, { name: "Task 1" });
		createTestTask(db, { name: "Task 2" });

		const console = captureConsole();
		await list({ cwd: testDir });

		expect(console.output).toContain("Task 1");
		expect(console.output).toContain("Task 2");
	});

	test("should show message for empty list", async () => {
		const console = captureConsole();
		await list({ cwd: testDir });

		expect(console.output).toContain("No tasks found");
	});

	test("should filter by --wip flag", async () => {
		createStatusTestTasks(db);

		const console = captureConsole();
		await list({ wip: true, cwd: testDir });

		expect(console.output).toContain("Not Converged Task");
		// Use more specific patterns to avoid substring matches
		expect(console.output).not.toMatch(/: Converged Task /);
		expect(console.output).not.toMatch(/: Pending Task /);
	});

	test("should filter by --focus flag", async () => {
		createTestTask(db, {
			name: "High Priority",
			priority: 1,
			status: null,
		});
		createTestTask(db, {
			name: "Medium Priority",
			priority: 3,
			status: null,
		});
		createTestTask(db, {
			name: "Blocked Task",
			priority: 1,
			status: TaskStatus.BLOCKED,
		});
		createTestTask(db, {
			name: "Low Priority",
			priority: 5,
			status: null,
		});

		const console = captureConsole();
		await list({ focus: true, cwd: testDir });

		expect(console.output).toContain("High Priority");
		expect(console.output).not.toContain("Medium Priority");
		expect(console.output).not.toContain("Blocked Task");
		expect(console.output).not.toContain("Low Priority");
	});

	test("should filter by --type flag", async () => {
		createTypeTestTasks(db);

		const console = captureConsole();
		await list({ type: TaskType.BUG, cwd: testDir });

		expect(console.output).toContain("Bug Task");
		expect(console.output).not.toContain("Epic Task");
		expect(console.output).not.toContain("Regular Task");
	});

	test("should combine filters", async () => {
		createTestTask(db, {
			name: "Bug WIP",
			type: TaskType.BUG,
			status: null,
			convergence: 0.5,
			priority: 1,
		});
		createTestTask(db, {
			name: "Bug Pending",
			type: TaskType.BUG,
			status: null,
			convergence: 1.0,
			priority: 1,
		});

		const console = captureConsole();
		await list({ wip: true, cwd: testDir });

		expect(console.output).toContain("Bug WIP");
		expect(console.output).not.toContain("Bug Pending");
	});

	test("should show tree structure", async () => {
		const parent = createTestTask(db, { name: "Parent", type: TaskType.EPIC });
		createTestTask(db, { name: "Child", parent_id: parent.id });

		const console = captureConsole();
		await list({ cwd: testDir });

		expect(console.output).toContain("Parent");
		expect(console.output).toContain("Child");
		// Tree structure indicators
		expect(console.output).toMatch(/[└├│]/);
	});
});
