import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import Database from "bun:sqlite";
import { SCHEMA_SQL } from "../../src/db/schema.ts";

describe("db/schema", () => {
  describe("SCHEMA_SQL", () => {
    let db: Database;

    beforeEach(() => {
      db = new Database(":memory:");
      db.run("PRAGMA foreign_keys = ON");
      db.run(SCHEMA_SQL);
    });

    afterEach(() => {
      db.close();
    });

    test("should create tasks table", () => {
      const result = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'").get();
      expect(result).toBeDefined();
    });

    test("should have all required columns", () => {
      const columns = db.query("PRAGMA table_info(tasks)").all() as any[];
      const columnNames = columns.map((c: any) => c.name);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("hash_id");
      expect(columnNames).toContain("name");
      expect(columnNames).toContain("type");
      expect(columnNames).toContain("priority");
      expect(columnNames).toContain("status");
      expect(columnNames).toContain("convergence");
      expect(columnNames).toContain("description");
      expect(columnNames).toContain("parent_id");
      expect(columnNames).toContain("created_at");
      expect(columnNames).toContain("updated_at");
    });

    test("should create unique index on hash_id", () => {
      const index = db.query(
        "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_tasks_hash_id'"
      ).get();
      expect(index).toBeDefined();
    });

    test("should create indexes on foreign keys", () => {
      const parentIndex = db.query(
        "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_tasks_parent_id'"
      ).get();
      expect(parentIndex).toBeDefined();
    });

    test("should create index on status", () => {
      const index = db.query(
        "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_tasks_status'"
      ).get();
      expect(index).toBeDefined();
    });

    test("should create index on type", () => {
      const index = db.query(
        "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_tasks_type'"
      ).get();
      expect(index).toBeDefined();
    });

    test("should create updated_at trigger", () => {
      const trigger = db.query(
        "SELECT name FROM sqlite_master WHERE type='trigger' AND name='update_tasks_timestamp'"
      ).get();
      expect(trigger).toBeDefined();
    });

    test("should enforce type constraint", () => {
      expect(() => {
        db.run(
          `INSERT INTO tasks (hash_id, name, type, priority, status, convergence)
           VALUES ('test-1', 'Test', 'invalid', 3, 'pending', 1.0)`
        );
      }).toThrow();
    });

    test("should enforce priority range constraint", () => {
      expect(() => {
        db.run(
          `INSERT INTO tasks (hash_id, name, type, priority, status, convergence)
           VALUES ('test-2', 'Test', 'task', 0, 'pending', 1.0)`
        );
      }).toThrow();

      expect(() => {
        db.run(
          `INSERT INTO tasks (hash_id, name, type, priority, status, convergence)
           VALUES ('test-3', 'Test', 'task', 6, 'pending', 1.0)`
        );
      }).toThrow();
    });

    test("should enforce status constraint", () => {
      expect(() => {
        db.run(
          `INSERT INTO tasks (hash_id, name, type, priority, status, convergence)
           VALUES ('test-4', 'Test', 'task', 3, 'invalid', 1.0)`
        );
      }).toThrow();
    });

    test("should enforce convergence range constraint", () => {
      expect(() => {
        db.run(
          `INSERT INTO tasks (hash_id, name, type, priority, status, convergence)
           VALUES ('test-5', 'Test', 'task', 3, 'pending', -0.1)`
        );
      }).toThrow();

      expect(() => {
        db.run(
          `INSERT INTO tasks (hash_id, name, type, priority, status, convergence)
           VALUES ('test-6', 'Test', 'task', 3, 'pending', 1.1)`
        );
      }).toThrow();
    });

    test("should enforce foreign key cascade delete", () => {
      // Insert parent
      db.run(
        `INSERT INTO tasks (hash_id, name, type, priority, convergence)
         VALUES ('parent-1', 'Parent', 'epic', 1, 1.0)`
      );
      const parentId = (db.query("SELECT last_insert_rowid()").get() as any)["last_insert_rowid()"];

      // Insert child
      db.run(
        `INSERT INTO tasks (hash_id, name, type, priority, convergence, parent_id)
         VALUES ('child-1', 'Child', 'task', 2, 1.0, ?)`,
        parentId
      );

      // Delete parent
      db.run("DELETE FROM tasks WHERE id = ?", parentId);

      // Child should be deleted
      const child = db.query("SELECT * FROM tasks WHERE hash_id = 'child-1'").get();
      expect(child).toBeNull();
    });

    test("should auto-generate created_at and updated_at", () => {
      db.run(
        `INSERT INTO tasks (hash_id, name, type, priority, convergence)
         VALUES ('test-7', 'Test', 'task', 3, 1.0)`
      );

      const task = db.query("SELECT * FROM tasks WHERE hash_id = 'test-7'").get() as any;
      expect(task.created_at).toBeDefined();
      expect(task.updated_at).toBeDefined();
    });

    test("should update updated_at on row update", async () => {
      db.run(
        `INSERT INTO tasks (hash_id, name, type, priority, convergence)
         VALUES ('test-8', 'Test', 'task', 3, 1.0)`
      );

      const before = db.query("SELECT * FROM tasks WHERE hash_id = 'test-8'").get() as any;
      const beforeTime = before.updated_at;

      // Wait 1 second to ensure different timestamp (SQLite datetime has second precision)
      await new Promise(r => setTimeout(r, 1100));

      db.run("UPDATE tasks SET name = 'Updated' WHERE hash_id = 'test-8'");

      const after = db.query("SELECT * FROM tasks WHERE hash_id = 'test-8'").get() as any;
      expect(after.name).toBe("Updated");
      expect(after.updated_at).not.toBe(beforeTime);
    });
  });
});
