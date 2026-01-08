import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateHash, getPlanConfig, savePlanConfig } from "../../src/services/id.ts";

describe("services/id", () => {
  const testDir = join(import.meta.dir, "test-plan-dir");
  const originalCwd = process.cwd();

  beforeEach(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    mkdirSync(join(testDir, ".plan"), { recursive: true });
    // Write config and change to test directory
    writeFileSync(join(testDir, ".plan", "config.json"), JSON.stringify({ prefix: "np", version: "1.0.0" }));
    process.chdir(testDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  describe("generateHash", () => {
    test("should generate 6 character hash", () => {
      const hash = generateHash("test-data");
      expect(hash).toHaveLength(6);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    test("should generate consistent hashes", () => {
      const hash1 = generateHash("same-data");
      const hash2 = generateHash("same-data");
      expect(hash1).toBe(hash2);
    });

    test("should generate different hashes for different data", () => {
      const hash1 = generateHash("data1");
      const hash2 = generateHash("data2");
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("savePlanConfig", () => {
    test("should save config to file", () => {
      const config = { prefix: "myapp", version: "1.0.0" };
      savePlanConfig(config);

      const configPath = join(testDir, ".plan", "config.json");
      expect(existsSync(configPath)).toBe(true);
      const saved = JSON.parse(readFileSync(configPath, "utf-8"));
      expect(saved).toEqual(config);
    });

    test("should overwrite existing config", () => {
      savePlanConfig({ prefix: "first", version: "1.0.0" });
      savePlanConfig({ prefix: "second", version: "2.0.0" });

      const configPath = join(testDir, ".plan", "config.json");
      const saved = JSON.parse(readFileSync(configPath, "utf-8"));
      expect(saved.prefix).toBe("second");
      expect(saved.version).toBe("2.0.0");
    });
  });

  describe("getPlanConfig", () => {
    test("should return config from file", () => {
      const config = { prefix: "myapp", version: "1.0.0" };
      writeFileSync(join(testDir, ".plan", "config.json"), JSON.stringify(config, null, 2));

      const result = getPlanConfig();
      expect(result).toEqual(config);
    });

    test("should return null for missing config", () => {
      rmSync(join(testDir, ".plan", "config.json"));
      const result = getPlanConfig();
      expect(result).toBeNull();
    });

    test("should return null for invalid JSON", () => {
      writeFileSync(join(testDir, ".plan", "config.json"), "invalid json");
      const result = getPlanConfig();
      expect(result).toBeNull();
    });
  });
});
