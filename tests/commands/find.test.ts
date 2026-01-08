import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { find } from "../../src/commands/find.ts";
import {
	clearProjectRootCache,
	closeDatabase,
	type getDatabase,
	initDatabase,
} from "../../src/db/client.ts";
import { captureConsole, createTestTask } from "../fixtures.ts";

describe("commands/find", () => {
	const testDir = join(import.meta.dir, "test-find-project");
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

	test("should find tasks matching query", async () => {
		createTestTask(db, { name: "Login feature" });
		createTestTask(db, { name: "Logout feature" });

		const console = captureConsole();
		await find("login", testDir);

		expect(console.output).toContain("Login feature");
		expect(console.output).toContain("match");
	});

	test("should show message for no matches", async () => {
		createTestTask(db, { name: "Some task" });

		const console = captureConsole();
		await find("nonexistent", testDir);

		expect(console.output).toContain("No tasks found");
		expect(console.output).toContain("nonexistent");
	});

	test("should show multiple results", async () => {
		createTestTask(db, { name: "Login page" });
		createTestTask(db, { name: "Login API" });
		createTestTask(db, { name: "Dashboard" });

		const console = captureConsole();
		await find("login", testDir);

		expect(console.output).toContain("Login page");
		expect(console.output).toContain("Login API");
		expect(console.output).toContain("Found 2");
	});

	test("should show match percentage", async () => {
		createTestTask(db, { name: "Login feature" });

		const console = captureConsole();
		await find("login", testDir);

		expect(console.output).toContain("%");
		expect(console.output).toContain("90%"); // startsWith match, not exact
	});

	test("should sort by match score", async () => {
		createTestTask(db, { name: "Login" });
		createTestTask(db, { name: "Login feature with extra text" });

		const console = captureConsole();
		await find("login", testDir);

		// First task (exact match) should appear before second task (startsWith match)
		const lines = console.output.split("\n");
		// lines[0] = "Found 2 task(s):", lines[1] = first task, lines[2] = second task
		expect(lines[1]).toContain("Login (100% match)");
		expect(lines[2]).toContain("Login feature with extra text (90% match)");
	});

	test("should show message for empty database", async () => {
		const console = captureConsole();
		await find("test", testDir);

		expect(console.output).toContain("No tasks found");
	});
});
