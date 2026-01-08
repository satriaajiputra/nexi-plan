import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { init } from "../../src/commands/init.ts";
import { clearProjectRootCache } from "../../src/db/client.ts";

describe("commands/init", () => {
	const testDir = join(import.meta.dir, "test-init-project");
	const originalCwd = process.cwd();

	beforeEach(() => {
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true });
		}
		mkdirSync(testDir, { recursive: true });
		// Change to test directory FIRST, then clear cache so it finds the new .plan
		process.chdir(testDir);
		clearProjectRootCache();
	});

	afterEach(() => {
		clearProjectRootCache();
		process.chdir(originalCwd);
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true });
		}
	});

	test("should create .plan directory", async () => {
		const planDir = join(testDir, ".plan");
		expect(existsSync(planDir)).toBe(false);

		await init("np", testDir);

		expect(existsSync(planDir)).toBe(true);
	});

	test("should create tasks.db database", async () => {
		const dbPath = join(testDir, ".plan", "tasks.db");
		expect(existsSync(dbPath)).toBe(false);

		await init("np", testDir);

		expect(existsSync(dbPath)).toBe(true);
	});

	test("should create config.json with prefix", async () => {
		const configPath = join(testDir, ".plan", "config.json");
		expect(existsSync(configPath)).toBe(false);

		await init("myapp", testDir);

		expect(existsSync(configPath)).toBe(true);
		const config = JSON.parse(readFileSync(configPath, "utf-8"));
		expect(config.prefix).toBe("myapp");
		expect(config.version).toBe("1.0.0");
	});

	test("should create AGENTS.md template", async () => {
		const agentsPath = join(testDir, "AGENTS.md");
		expect(existsSync(agentsPath)).toBe(false);

		await init("np", testDir);

		expect(existsSync(agentsPath)).toBe(true);
		const content = readFileSync(agentsPath, "utf-8");
		expect(content).toContain("np");
		expect(content).toContain("Task Tracking");
	});

	test("should use default prefix 'np'", async () => {
		const configPath = join(testDir, ".plan", "config.json");

		await init(undefined, testDir);

		const config = JSON.parse(readFileSync(configPath, "utf-8"));
		expect(config.prefix).toBe("np");
	});

	test("should handle existing .plan directory", async () => {
		const planDir = join(testDir, ".plan");
		mkdirSync(planDir, { recursive: true });

		// Should not throw
		await init("np", testDir);

		expect(existsSync(planDir)).toBe(true);
	});
});
