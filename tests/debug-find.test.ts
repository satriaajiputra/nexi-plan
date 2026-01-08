import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { find } from "../src/commands/find.ts";
import { createTestTask } from "./fixtures.ts";
import { initDatabase, getDatabase, closeDatabase, clearProjectRootCache } from "../src/db/client.ts";

describe("debug find", () => {
  const testDir = join(import.meta.dir, "test-debug-find");
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

  test("debug find output", async () => {
    createTestTask(db, { name: "Login feature" });

    let output = "";
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      output += args.join(" ") + "\n";
      originalLog.apply(console, args); // Also print to actual console
    };

    console.log("BEFORE find call");
    try {
      await find("login", testDir);
    } catch (e: any) {
      console.log("ERROR:", e.message);
      console.log("Stack:", e.stack);
    }
    console.log("AFTER find call, output:", JSON.stringify(output));

    console.log = originalLog;

    expect(output).toContain("Login");
  });
});
