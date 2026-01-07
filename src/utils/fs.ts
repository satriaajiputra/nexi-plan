import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Create plan directory if it doesn't exist
 */
export function ensurePlanDir(): string {
  const planDir = join(process.cwd(), ".plan");

  if (!existsSync(planDir)) {
    mkdirSync(planDir, { recursive: true });
  }

  return planDir;
}

/**
 * Read description from file or stdin
 * Supports:
 * - Inline: "description text"
 * - From file: @filename.md
 * - From stdin: -
 */
export interface DescriptionInput {
  source: "inline" | "file" | "stdin";
  content?: string;
  filePath?: string;
}

export function readDescription(input: string, stdinContent?: string): string {
  if (input.startsWith("@")) {
    // Read from file
    const filePath = input.slice(1);
    const fullPath = join(process.cwd(), filePath);

    try {
      return readFileSync(fullPath, "utf-8");
    } catch (err) {
      throw new Error(`Failed to read file: ${filePath}`);
    }
  }

  if (input === "-") {
    // Read from stdin
    if (!stdinContent) {
      throw new Error("No stdin content provided");
    }
    return stdinContent;
  }

  // Inline description
  return input;
}

/**
 * Check if description input is from file
 */
export function isFromFile(input: string): boolean {
  return input.startsWith("@");
}

/**
 * Check if description input is from stdin
 */
export function isFromStdin(input: string): boolean {
  return input === "-";
}

/**
 * Get file path from @filename notation
 */
export function extractFilePath(input: string): string {
  return input.slice(1);
}

/**
 * Read stdin content
 */
export async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";

    process.stdin.setEncoding("utf-8");

    process.stdin.on("data", (chunk) => {
      data += chunk;
    });

    process.stdin.on("end", () => {
      resolve(data);
    });

    process.stdin.on("error", (err) => {
      reject(err);
    });

    // Set timeout for stdin
    setTimeout(() => {
      resolve(data);
    }, 100);
  });
}

/**
 * Write file to plan directory
 */
export function writePlanFile(filename: string, content: string): void {
  const planDir = ensurePlanDir();
  const filePath = join(planDir, filename);

  try {
    Bun.write(filePath, content);
  } catch (err) {
    throw new Error(`Failed to write file: ${filename}`);
  }
}

/**
 * Read file from plan directory
 */
export function readPlanFile(filename: string): string | null {
  const planDir = join(process.cwd(), ".plan");
  const filePath = join(planDir, filename);

  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}
