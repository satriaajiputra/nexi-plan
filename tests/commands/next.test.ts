import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { next as nextCmd } from "../../src/commands/next.ts";
import {
	clearProjectRootCache,
	closeDatabase,
	type getDatabase,
	initDatabase,
} from "../../src/db/client.ts";
import { TaskStatus } from "../../src/models/task.ts";
import { createTestTask } from "../fixtures.ts";

describe("commands/next", () => {
	const testDir = join(import.meta.dir, "test-next-project");
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

	test("should show highest priority non-converged task", async () => {
		createTestTask(db, {
			name: "P3 Task",
			priority: 3,
			status: null,
			convergence: 1.0,
		});
		createTestTask(db, {
			name: "P1 Task",
			priority: 1,
			status: null,
			convergence: 1.0,
		});
		createTestTask(db, {
			name: "P2 Task",
			priority: 2,
			status: null,
			convergence: 1.0,
		});

		const console = captureConsole();
		await nextCmd(testDir);

		expect(console.output).toContain("P1 Task");
		expect(console.output).not.toContain("P2 Task");
		expect(console.output).not.toContain("P3 Task");
	});

	test("should prefer tasks closer to convergence for same priority", async () => {
		createTestTask(db, {
			name: "P1 Pending",
			priority: 1,
			status: null,
			convergence: 1.0,
		});
		createTestTask(db, {
			name: "P1 WIP",
			priority: 1,
			status: null,
			convergence: 0.5,
		});

		const console = captureConsole();
		await nextCmd(testDir);

		expect(console.output).toContain("P1 WIP");
	});

	test("should show message when all tasks converged/blocked", async () => {
		createTestTask(db, { name: "Converged", status: null, convergence: 0.0 });
		createTestTask(db, { name: "Blocked", status: TaskStatus.BLOCKED });

		const console = captureConsole();
		await nextCmd(testDir);

		expect(console.output).toContain("No pending tasks");
		expect(console.output).toContain("converged");
		expect(console.output).toContain("blocked");
	});

	test("should show empty message when no tasks exist", async () => {
		const console = captureConsole();
		await nextCmd(testDir);

		expect(console.output).toContain("No pending tasks found");
		expect(console.output).toContain("converged");
		expect(console.output).toContain("blocked");
		expect(console.output).toContain("cancelled");
	});

	test("should fallback to highest priority non-converged task", async () => {
		createTestTask(db, {
			name: "P1 Blocked",
			priority: 1,
			status: TaskStatus.BLOCKED,
		});
		createTestTask(db, {
			name: "P2 Pending",
			priority: 2,
			status: null,
			convergence: 1.0,
		});

		const console = captureConsole();
		await nextCmd(testDir);

		expect(console.output).toContain("P2 Pending");
	});
});

function captureConsole() {
	const output = { value: "" };
	const originalLog = console.log;
	console.log = (...args: unknown[]) => {
		output.value += args.join(" ") + "\n";
	};
	return {
		get output() {
			return output.value;
		},
		restore: () => {
			console.log = originalLog;
		},
	};
}
