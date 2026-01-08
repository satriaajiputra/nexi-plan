import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { PlanConfig } from "../models/task.js";

const CONFIG_FILE = ".plan/config.json";

/**
 * Get the current plan configuration
 */
export function getPlanConfig(cwd?: string): PlanConfig | null {
  try {
    const path = join(cwd ?? process.cwd(), CONFIG_FILE);
    const content = readFileSync(path, "utf-8");
    return JSON.parse(content) as PlanConfig;
  } catch {
    return null;
  }
}

/**
 * Save the plan configuration
 */
export function savePlanConfig(config: PlanConfig, planDir?: string): void {
  const cwd = planDir ? join(planDir, "..") : process.cwd();
  const path = join(cwd, CONFIG_FILE);
  writeFileSync(path, JSON.stringify(config, null, 2));
}

/**
 * Generate a short hash from data
 */
export function generateHash(data: string): string {
  const fullHash = createHash("sha256").update(data).digest("hex");
  // Take first 6 characters for a short ID
  return fullHash.slice(0, 6);
}

/**
 * Generate a unique task ID with prefix
 */
export function generateTaskId(cwd?: string): string {
  const config = getPlanConfig(cwd);
  const prefix = config?.prefix ?? "np";

  // Combine timestamp with random bytes for uniqueness
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).slice(2);
  const hashData = `${timestamp}-${random}`;

  const hash = generateHash(hashData);
  return `${prefix}-${hash}`;
}

/**
 * Validate a task ID format (prefix-hash)
 */
export function validateTaskId(id: string, cwd?: string): boolean {
  const config = getPlanConfig(cwd);
  const prefix = config?.prefix ?? "np";
  const pattern = new RegExp(`^${prefix}-[a-f0-9]{6}$`);
  return pattern.test(id);
}
