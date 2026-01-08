import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { add } from "../../src/commands/add.ts";
import {
	clearProjectRootCache,
	closeDatabase,
	type getDatabase,
	initDatabase,
} from "../../src/db/client.ts";
import { getAllTasks, getTaskById } from "../../src/db/queries.ts";
import { TaskStatus, TaskType } from "../../src/models/task.ts";
import { propagateConvergence } from "../../src/services/convergence.ts";

describe("commands/add", () => {
	const testDir = join(import.meta.dir, "test-add-project");
	const originalCwd = process.cwd();
	let db: ReturnType<typeof getDatabase>;

	beforeEach(() => {
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true });
		}
		mkdirSync(testDir, { recursive: true });
		mkdirSync(join(testDir, ".plan"), { recursive: true });
		db = initDatabase(join(testDir, ".plan", "tasks.db"));
		// Change to test directory so commands find the database, then clear cache
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

	test("should create task with default values", async () => {
		await add({ name: "Test Task", cwd: testDir });

		const tasks = getAllTasks(db);
		expect(tasks).toHaveLength(1);
		expect(tasks[0]!.name).toBe("Test Task");
		expect(tasks[0]!.type).toBe(TaskType.TASK);
		expect(tasks[0]!.priority).toBe(3);
		expect(tasks[0]!.status).toBe(TaskStatus.PENDING);
		expect(tasks[0]!.convergence).toBe(1.0);
	});

	test("should detect bug type from fix: prefix", async () => {
		await add({ name: "fix: login bug", cwd: testDir });

		const tasks = getAllTasks(db);
		expect(tasks[0]!.type).toBe(TaskType.BUG);
		expect(tasks[0]!.name).toBe("Login bug"); // Cleaned name
	});

	test("should detect task type from feat: prefix", async () => {
		await add({ name: "feat: new feature", cwd: testDir });

		const tasks = getAllTasks(db);
		expect(tasks[0]!.type).toBe(TaskType.TASK);
		expect(tasks[0]!.name).toBe("New feature");
	});

	test("should detect epic type from epic: prefix", async () => {
		await add({ name: "epic: big project", cwd: testDir });

		const tasks = getAllTasks(db);
		expect(tasks[0]!.type).toBe(TaskType.EPIC);
		expect(tasks[0]!.name).toBe("Big project");
	});

	test("should detect priority 1 from urgent: prefix", async () => {
		await add({ name: "urgent: critical issue", cwd: testDir });

		const tasks = getAllTasks(db);
		expect(tasks[0]!.priority).toBe(1);
	});

	test("should detect priority 2 from important: prefix", async () => {
		await add({ name: "important: feature", cwd: testDir });

		const tasks = getAllTasks(db);
		expect(tasks[0]!.priority).toBe(2);
	});

	test("should accept explicit type flag", async () => {
		await add({ name: "Task", type: TaskType.BUG, cwd: testDir });

		const tasks = getAllTasks(db);
		expect(tasks[0]!.type).toBe(TaskType.BUG);
	});

	test("should accept explicit priority flag", async () => {
		await add({ name: "Task", priority: 5, cwd: testDir });

		const tasks = getAllTasks(db);
		expect(tasks[0]!.priority).toBe(5);
	});

	test("should set description", async () => {
		await add({
			name: "Task",
			description: "A long description",
			cwd: testDir,
		});

		const tasks = getAllTasks(db);
		expect(tasks[0]!.description).toBe("A long description");
	});

	test("should read description from file", async () => {
		const descFile = join(testDir, "description.md");
		writeFileSync(descFile, "Content from file");

		await add({ name: "Task", description: `@${descFile}`, cwd: testDir });

		const tasks = getAllTasks(db);
		expect(tasks[0]!.description).toBe("Content from file");
	});

	test("should set parent task via deps", async () => {
		// Create parent first
		await add({ name: "Parent Epic", type: TaskType.EPIC, cwd: testDir });
		const parent = getAllTasks(db)[0]!;

		await add({ name: "Child Task", deps: parent.hash_id, cwd: testDir });

		const child = getAllTasks(db)[1]!;
		expect(child.parent_id).toBe(parent.id);
	});

	test("should propagate convergence to parent", async () => {
		// Create parent
		await add({ name: "Parent", type: TaskType.EPIC, cwd: testDir });
		const parent = getAllTasks(db)[0]!;

		// Add child with convergence 0
		await add({ name: "Child", deps: parent.hash_id, cwd: testDir });
		const child = getAllTasks(db)[1]!;

		// Update child convergence to 0
		// @ts-expect-error
		db.run("UPDATE tasks SET convergence = 0 WHERE id = ?", child.id);

		// Trigger convergence propagation (must be called explicitly for direct SQL updates)
		propagateConvergence(db, child.id);

		const updatedParent = getTaskById(db, parent.hash_id);
		expect(updatedParent!.convergence).toBeLessThan(1);
	});

	test("should generate unique hash_id", async () => {
		await add({ name: "Task 1", cwd: testDir });
		await add({ name: "Task 2", cwd: testDir });

		const tasks = getAllTasks(db);
		expect(tasks[0]!.hash_id).not.toBe(tasks[1]!.hash_id);
		expect(tasks[0]!.hash_id).toMatch(/^np-[a-z0-9]{6}$/);
	});
});
