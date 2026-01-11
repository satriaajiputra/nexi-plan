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

	test("should create CLAUDE.md template", async () => {
		const claudePath = join(testDir, "CLAUDE.md");
		expect(existsSync(claudePath)).toBe(false);

		await init("np", testDir);

		expect(existsSync(claudePath)).toBe(true);
		const content = readFileSync(claudePath, "utf-8");
		expect(content).toContain("np");
		expect(content).toContain("Task Tracking");
	});

	test("should backup existing CLAUDE.md", async () => {
		const claudePath = join(testDir, "CLAUDE.md");
		const backupPath = join(testDir, "CLAUDE.bak.md");
		const originalContent = "# Original Content";

		Bun.write(claudePath, originalContent);

		await init("np", testDir);

		// Backup should exist with original content
		expect(existsSync(backupPath)).toBe(true);
		const backupContent = readFileSync(backupPath, "utf-8");
		expect(backupContent).toBe(originalContent);

		// New CLAUDE.md should have template
		const claudeContent = readFileSync(claudePath, "utf-8");
		expect(claudeContent).toContain("Task Tracking");
	});

	test("should create convergence-verifier.md agent", async () => {
		const agentPath = join(testDir, ".claude", "agents", "convergence-verifier.md");

		await init("np", testDir);

		expect(existsSync(agentPath)).toBe(true);
		const content = readFileSync(agentPath, "utf-8");
		expect(content).toContain("convergence");
	});

	test("should backup existing convergence-verifier.md", async () => {
		const agentPath = join(testDir, ".claude", "agents", "convergence-verifier.md");
		const backupPath = join(testDir, ".claude", "agents", ".convergence-verifier.bak");
		const originalContent = "# Original Agent";

		mkdirSync(join(testDir, ".claude", "agents"), { recursive: true });
		Bun.write(agentPath, originalContent);

		await init("np", testDir);

		// Backup should exist
		expect(existsSync(backupPath)).toBe(true);
		const backupContent = readFileSync(backupPath, "utf-8");
		expect(backupContent).toBe(originalContent);
	});

	test("should create verify-convergence.md command", async () => {
		const commandPath = join(
			testDir,
			".claude",
			"commands",
			"verify-convergence.md",
		);

		await init("np", testDir);

		expect(existsSync(commandPath)).toBe(true);
		const content = readFileSync(commandPath, "utf-8");
		expect(content).toContain("verify");
	});

	test("should backup existing verify-convergence.md", async () => {
		const commandPath = join(
			testDir,
			".claude",
			"commands",
			"verify-convergence.md",
		);
		const backupPath = join(
			testDir,
			".claude",
			"commands",
			".verify-convergence.bak",
		);
		const originalContent = "# Original Command";

		mkdirSync(join(testDir, ".claude", "commands"), { recursive: true });
		Bun.write(commandPath, originalContent);

		await init("np", testDir);

		// Backup should exist
		expect(existsSync(backupPath)).toBe(true);
		const backupContent = readFileSync(backupPath, "utf-8");
		expect(backupContent).toBe(originalContent);
	});
});
