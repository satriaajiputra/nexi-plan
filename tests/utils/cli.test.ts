import { test, expect, describe } from "bun:test";
import {
  parseArgs,
  normalizeFlags,
  getFlag,
  hasFlag,
  getArg,
  requireFlags,
  FLAG_MAP,
} from "../../src/utils/cli.ts";

describe("utils/cli", () => {
  describe("parseArgs", () => {
    test("should extract command", () => {
      const result = parseArgs(["bun", "script.ts", "add"]);
      expect(result.command).toBe("add");
    });

    test("should extract positional arguments", () => {
      const result = parseArgs(["bun", "script.ts", "add", "task1", "task2"]);
      expect(result.command).toBe("add");
      expect(result.args).toEqual(["task1", "task2"]);
    });

    test("should handle long flags with equals", () => {
      const result = parseArgs(["bun", "script.ts", "add", "--name=value", "--type=task"]);
      expect(result.command).toBe("add");
      expect(result.flags["name"]).toBe("value");
      expect(result.flags["type"]).toBe("task");
    });

    test("should handle long flags with space", () => {
      const result = parseArgs(["bun", "script.ts", "add", "--name", "value"]);
      expect(result.command).toBe("add");
      expect(result.flags["name"]).toBe("value");
    });

    test("should handle short flags with space", () => {
      const result = parseArgs(["bun", "script.ts", "add", "-n", "value"]);
      expect(result.command).toBe("add");
      expect(result.flags["n"]).toBe("value");
    });

    test("should handle boolean flags without values", () => {
      const result = parseArgs(["bun", "script.ts", "add", "--wip"]);
      expect(result.command).toBe("add");
      expect(result.flags["wip"]).toBe(true);
    });

    test("should handle short boolean flags", () => {
      const result = parseArgs(["bun", "script.ts", "add", "-v"]);
      expect(result.command).toBe("add");
      expect(result.flags["v"]).toBe(true);
    });

    test("should stop parsing at -- and treat remaining as positional", () => {
      const result = parseArgs(["bun", "script.ts", "add", "--name", "value", "--", "-n", "flag"]);
      expect(result.command).toBe("add");
      expect(result.flags["name"]).toBe("value");
      expect(result.args).toEqual(["-n", "flag"]);
    });

    test("should default to help when no command", () => {
      const result = parseArgs(["bun", "script.ts"]);
      expect(result.command).toBe("help");
    });

    test("should handle empty array", () => {
      const result = parseArgs([]);
      expect(result.command).toBe("help");
    });

    test("should handle mixed flags and args", () => {
      const result = parseArgs(["bun", "script.ts", "add", "-n", "task", "--type", "bug", "extra"]);
      expect(result.command).toBe("add");
      expect(result.flags["n"]).toBe("task");
      expect(result.flags["type"]).toBe("bug");
      expect(result.args).toEqual(["extra"]);
    });

    test("should not consume next flag as value", () => {
      const result = parseArgs(["bun", "script.ts", "add", "-n", "--type", "task"]);
      expect(result.command).toBe("add");
      expect(result.flags["n"]).toBe(true);
      expect(result.flags["type"]).toBe("task");
    });
  });

  describe("normalizeFlags", () => {
    test("should expand short flags to long flags", () => {
      const result = normalizeFlags({ n: "value", t: "task" });
      expect(result["name"]).toBe("value");
      expect(result["type"]).toBe("task");
    });

    test("should preserve long flags", () => {
      const result = normalizeFlags({ name: "value", type: "task" });
      expect(result["name"]).toBe("value");
      expect(result["type"]).toBe("task");
    });

    test("should handle boolean flags", () => {
      const result = normalizeFlags({ wip: true, h: true });
      expect(result["wip"]).toBe(true);
      expect(result["help"]).toBe(true);
    });

    test("should preserve unknown flags", () => {
      const result = normalizeFlags({ custom: "value" });
      expect(result["custom"]).toBe("value");
    });

    test("should handle undefined values", () => {
      const result = normalizeFlags({ name: undefined });
      expect(result["name"]).toBeUndefined();
    });
  });

  describe("FLAG_MAP", () => {
    test("should have correct mappings", () => {
      expect(FLAG_MAP["n"]).toBe("name");
      expect(FLAG_MAP["t"]).toBe("type");
      expect(FLAG_MAP["p"]).toBe("priority");
      expect(FLAG_MAP["d"]).toBe("description");
      expect(FLAG_MAP["s"]).toBe("status");
      expect(FLAG_MAP["c"]).toBe("convergence");
      expect(FLAG_MAP["h"]).toBe("help");
      expect(FLAG_MAP["v"]).toBe("version");
    });
  });

  describe("getFlag", () => {
    const flags = { name: "value", type: "task", bool: true, empty: "" };

    test("should get string flag value", () => {
      expect(getFlag(flags, "name")).toBe("value");
    });

    test("should get flag with default", () => {
      expect(getFlag(flags, "missing", "default")).toBe("default");
    });

    test("should return default for boolean flags", () => {
      expect(getFlag(flags, "bool")).toBeUndefined();
      expect(getFlag(flags, "bool", "default")).toBe("default");
    });

    test("should return default for undefined flags", () => {
      expect(getFlag(flags, "missing")).toBeUndefined();
    });

    test("should return default for empty string", () => {
      expect(getFlag(flags, "empty")).toBeUndefined();
      expect(getFlag(flags, "empty", "default")).toBe("default");
    });
  });

  describe("hasFlag", () => {
    const flags = { enabled: true, disabled: false, stringTrue: "true", missing: undefined };

    test("should return true for boolean true", () => {
      expect(hasFlag(flags, "enabled")).toBe(true);
    });

    test("should return false for boolean false", () => {
      expect(hasFlag(flags, "disabled")).toBe(false);
    });

    test("should return true for string 'true'", () => {
      expect(hasFlag(flags, "stringTrue")).toBe(true);
    });

    test("should return false for undefined", () => {
      expect(hasFlag(flags, "missing")).toBe(false);
    });
  });

  describe("getArg", () => {
    test("should get positional argument by index", () => {
      expect(getArg(["a", "b", "c"], 0)).toBe("a");
      expect(getArg(["a", "b", "c"], 1)).toBe("b");
      expect(getArg(["a", "b", "c"], 2)).toBe("c");
    });

    test("should return undefined for out of bounds", () => {
      expect(getArg(["a", "b"], 5)).toBeUndefined();
    });

    test("should return default for out of bounds", () => {
      expect(getArg(["a"], 0, "default")).toBe("a");
      expect(getArg(["a"], 5, "default")).toBe("default");
    });

    test("should handle empty array", () => {
      expect(getArg([], 0)).toBeUndefined();
      expect(getArg([], 0, "default")).toBe("default");
    });
  });

  describe("requireFlags", () => {
    test("should not throw for all present flags", () => {
      const flags = { name: "value", type: "task" };
      expect(() => requireFlags(flags, ["name", "type"])).not.toThrow();
    });

    test("should throw for missing flags", () => {
      const flags = { name: "value" };
      expect(() => requireFlags(flags, ["name", "type"])).toThrow(
        "Missing required flags: --type"
      );
    });

    test("should list all missing flags", () => {
      const flags = {};
      expect(() => requireFlags(flags, ["name", "type", "priority"])).toThrow(
        "Missing required flags: --name, --type, --priority"
      );
    });
  });
});
