import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { readDescription, isFromFile, isFromStdin, extractFilePath } from "../../src/utils/fs.ts";

describe("utils/fs", () => {
  const testDir = join(import.meta.dir, "test-fixtures");
  const originalCwd = process.cwd();

  beforeEach(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    // Change to test directory so file paths work
    process.chdir(testDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  describe("readDescription", () => {
    test("should return inline description as-is", () => {
      const result = readDescription("This is a description");
      expect(result).toBe("This is a description");
    });

    test("should read from file when prefixed with @", () => {
      const fileName = "test-desc.md";
      const filePath = join(testDir, fileName);
      writeFileSync(filePath, "Content from file");

      // Pass just the filename (relative path) since code joins with cwd
      const result = readDescription(`@${fileName}`);
      expect(result).toBe("Content from file");
    });

    test("should throw error for missing file", () => {
      expect(() => readDescription("@nonexistent/file.md")).toThrow(
        "Failed to read file: nonexistent/file.md"
      );
    });

    test("should return stdin content when input is -", () => {
      const stdinContent = "Content from stdin";
      const result = readDescription("-", stdinContent);
      expect(result).toBe("Content from stdin");
    });

    test("should throw error when stdin is - but no content provided", () => {
      expect(() => readDescription("-")).toThrow(
        "No stdin content provided"
      );
    });

    test("should handle empty string description", () => {
      const result = readDescription("");
      expect(result).toBe("");
    });

    test("should preserve whitespace in inline description", () => {
      const result = readDescription("  Some text with spaces  ");
      expect(result).toBe("  Some text with spaces  ");
    });
  });

  describe("isFromFile", () => {
    test("should return true for @ prefixed input", () => {
      expect(isFromFile("@file.txt")).toBe(true);
      expect(isFromFile("@path/to/file.md")).toBe(true);
    });

    test("should return false for non-@ prefixed input", () => {
      expect(isFromFile("plain text")).toBe(false);
      expect(isFromFile("-")).toBe(false);
    });
  });

  describe("isFromStdin", () => {
    test("should return true for -", () => {
      expect(isFromStdin("-")).toBe(true);
    });

    test("should return false for other inputs", () => {
      expect(isFromStdin("text")).toBe(false);
      expect(isFromStdin("@file")).toBe(false);
      expect(isFromStdin("")).toBe(false);
    });
  });

  describe("extractFilePath", () => {
    test("should extract path from @ prefix", () => {
      expect(extractFilePath("@file.txt")).toBe("file.txt");
      expect(extractFilePath("@path/to/file.md")).toBe("path/to/file.md");
    });

    test("should handle complex paths", () => {
      expect(extractFilePath("@/absolute/path/file.txt")).toBe("/absolute/path/file.txt");
    });
  });
});
