import Database from "bun:sqlite";
import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { SCHEMA_SQL } from "./schema.js";

const PLAN_DIR = ".plan";
const DB_NAME = "tasks.db";

// Cache the project root to avoid repeated traversal
let cachedProjectRoot: string | null = null;

/**
 * Check if a directory is a home directory boundary
 * Stops traversal at /home, /Users, or the actual user home
 */
function isAtHomeBoundary(currentDir: string): boolean {
	const normalized = resolve(currentDir);

	// Check if we're at a home root (Linux: /home, macOS: /Users)
	if (normalized === "/home" || normalized === "/Users") {
		return true;
	}

	// Check if we're at the user's home directory
	const userHome = resolve(process.env.HOME || process.env.USERPROFILE || "");
	if (normalized === userHome) {
		return true;
	}

	return false;
}

/**
 * Find the project root by traversing up the directory tree
 * Stops at:
 * - .plan directory found (success)
 * - Home directory boundary (safety limit)
 * - Filesystem root (ultimate limit)
 */
export function findProjectRoot(startDir: string = process.cwd()): string | null {
	// Check cache first
	if (cachedProjectRoot) {
		return cachedProjectRoot;
	}

	let currentDir = resolve(startDir);
	const root = resolve("/");

	// Traverse up the directory tree
	while (currentDir !== root && currentDir !== resolve(join(currentDir, ".."))) {
		// Check for .plan directory
		const planPath = join(currentDir, PLAN_DIR);
		if (existsSync(planPath)) {
			// Verify it's actually a directory
			try {
				readdirSync(planPath);
				cachedProjectRoot = currentDir;
				return currentDir;
			} catch {
				// Not accessible, continue searching
			}
		}

		// Stop at home directory boundary
		if (isAtHomeBoundary(currentDir)) {
			break;
		}

		// Move to parent directory
		currentDir = resolve(join(currentDir, ".."));
	}

	return null;
}

/**
 * Clear the cached project root (useful for testing or after init)
 */
export function clearProjectRootCache(): void {
	cachedProjectRoot = null;
}

/**
 * Get the project root directory (throws if not found)
 */
export function getProjectRoot(): string {
	const root = findProjectRoot();
	if (!root) {
		throw new Error(
			`No .plan directory found in current directory or any parent directory. Run 'np init' first.`,
		);
	}
	return root;
}

/**
 * Get the database path
 */
export function getDbPath(): string {
	try {
		const root = getProjectRoot();
		return join(root, PLAN_DIR, DB_NAME);
	} catch {
		// Fallback to current directory for init command
		return join(process.cwd(), PLAN_DIR, DB_NAME);
	}
}

/**
 * Get the plan directory path
 */
export function getPlanDir(): string {
	try {
		const root = getProjectRoot();
		return join(root, PLAN_DIR);
	} catch {
		// Fallback to current directory for init command
		return join(process.cwd(), PLAN_DIR);
	}
}

/**
 * Check if plan directory exists in current directory tree
 */
export function planExists(): boolean {
	return findProjectRoot() !== null;
}

/**
 * Initialize database with schema
 */
export function initDatabase(dbPath: string = getDbPath()): Database {
	const db = new Database(dbPath);
	db.run("PRAGMA foreign_keys = ON");

	// Execute schema
	db.run(SCHEMA_SQL);

	return db;
}

/**
 * Get database connection (must be initialized first)
 */
export function getDatabase(dbPath: string = getDbPath()): Database {
	if (!existsSync(dbPath)) {
		throw new Error(
			`Database not found. Run 'np init' first to initialize the project.`,
		);
	}
	const db = new Database(dbPath);
	db.run("PRAGMA foreign_keys = ON");
	return db;
}

/**
 * Close database connection
 */
export function closeDatabase(db: Database): void {
	db.close();
}
