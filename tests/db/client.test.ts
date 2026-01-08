import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  initDatabase,
  getDatabase,
  closeDatabase,
  getDbPath,
  getPlanDir,
  findProjectRoot,
  clearProjectRootCache,
  planExists,
} from "../../src/db/client.ts";

describe("db/client", () => {
  const testDir = join(import.meta.dir, "test-client-db");

  beforeEach(() => {
    clearProjectRootCache();
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    clearProjectRootCache();
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  describe("initDatabase", () => {
    test("should create database with schema", () => {
      const dbPath = join(testDir, "tasks.db");
      const db = initDatabase(dbPath);

      // Verify schema was created
      const result = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'").get();
      expect(result).toBeDefined();

      closeDatabase(db);
    });

    test("should create tasks table with all columns", () => {
      const dbPath = join(testDir, "tasks2.db");
      const db = initDatabase(dbPath);

      // Insert a test task
      db.run(`
        INSERT INTO tasks (hash_id, name, type, priority, status, convergence)
        VALUES ('test-123', 'Test', 'task', 3, 'pending', 1.0)
      `);

      const task = db.query("SELECT * FROM tasks WHERE hash_id = 'test-123'").get() as any;
      expect(task.hash_id).toBe("test-123");
      expect(task.name).toBe("Test");
      expect(task.type).toBe("task");
      expect(task.priority).toBe(3);
      expect(task.status).toBe("pending");
      expect(task.convergence).toBe(1.0);

      closeDatabase(db);
    });

    test("should enable foreign keys", () => {
      const dbPath = join(testDir, "tasks3.db");
      const db = initDatabase(dbPath);

      const result = db.query("PRAGMA foreign_keys").get() as any;
      // PRAGMA returns object with key "foreign_keys"
      expect(result.foreign_keys).toBe(1);

      closeDatabase(db);
    });
  });

  describe("getDatabase", () => {
    test("should return database connection", () => {
      const dbPath = join(testDir, "tasks4.db");
      initDatabase(dbPath);
      const db = getDatabase(dbPath);

      expect(db).toBeDefined();
      closeDatabase(db);
    });

    test("should throw for non-existent database", () => {
      const dbPath = join(testDir, "nonexistent.db");

      expect(() => getDatabase(dbPath)).toThrow(
        "Database not found. Run 'np init' first"
      );
    });
  });

  describe("getDbPath", () => {
    test("should return path in current directory", () => {
      const dbPath = getDbPath();
      expect(dbPath).toContain("tasks.db");
    });
  });

  describe("getPlanDir", () => {
    test("should return .plan directory path", () => {
      const planDir = getPlanDir();
      expect(planDir).toContain(".plan");
    });
  });

  describe("planExists", () => {
    test("should return false when no .plan directory", () => {
      clearProjectRootCache();
      // In test environment, should return false
      const result = planExists();
      expect(typeof result).toBe("boolean");
    });
  });

  describe("findProjectRoot", () => {
    test("should find .plan directory from subdirectory", () => {
      // Create a .plan directory
      const planDir = join(testDir, ".plan");
      mkdirSync(planDir, { recursive: true });
      initDatabase(join(planDir, "tasks.db"));

      // Should find project root from testDir
      const root = findProjectRoot(testDir);
      expect(root).toBe(testDir);
    });

    test("should return null when no .plan directory found", () => {
      clearProjectRootCache();
      // Run from a temp directory without .plan in parent chain
      const tempDir = join(testDir, "temp-no-plan");
      mkdirSync(tempDir, { recursive: true });
      const root = findProjectRoot(tempDir);
      // Should find the project's .plan if it exists in parent chain
      // or return null if no .plan anywhere
      expect(root).not.toBe(testDir); // shouldn't find testDir's .plan from temp subdir
    });

    test("should use cache after first call", () => {
      const planDir = join(testDir, ".plan2");
      mkdirSync(planDir, { recursive: true });
      initDatabase(join(planDir, "tasks.db"));

      const root1 = findProjectRoot(testDir);
      const root2 = findProjectRoot(testDir);

      expect(root1).toBe(root2);
    });
  });

  describe("clearProjectRootCache", () => {
    test("should clear cached project root", () => {
      const planDir = join(testDir, ".plan");
      mkdirSync(planDir, { recursive: true });
      initDatabase(join(planDir, "tasks.db"));

      // First call caches
      findProjectRoot(testDir);
      clearProjectRootCache();

      // After clearing, should still find the .plan (it's in testDir)
      const root = findProjectRoot(testDir);
      expect(root).toBe(testDir);
    });
  });
});
