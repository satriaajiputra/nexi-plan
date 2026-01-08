import { test, expect, describe } from "bun:test";

describe("console mock test", () => {
  test("should capture console.log", () => {
    let output = "";
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      output += args.join(" ") + "\n";
    };

    console.log("Hello");
    console.log("World");

    console.log = originalLog;

    expect(output).toContain("Hello");
    expect(output).toContain("World");
  });
});
