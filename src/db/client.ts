import Database from "bun:sqlite";
import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { SCHEMA_SQL } from "./schema.js";
import { runMigrations, initMigrationSystem } from "./migrations.js";

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
 * Does NOT use or update cache - pure traversal
 * Stops at:
 * - .plan directory found (success)
 * - Home directory boundary (safety limit)
 * - Filesystem root (ultimate limit)
 */
function findProjectRootNoCache(startDir: string): string | null {
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
 * Find the project root (uses cache for performance)
 */
export function findProjectRoot(startDir: string = process.cwd()): string | null {
	// Check cache first
	if (cachedProjectRoot) {
		return cachedProjectRoot;
	}

	const root = findProjectRootNoCache(startDir);
	if (root) {
		cachedProjectRoot = root;
	}
	return root;
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
export function getProjectRoot(cwd: string = process.cwd()): string {
	const root = findProjectRoot(cwd);
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
export function getDbPath(cwd: string = process.cwd()): string {
	const planDir = getPlanDir(cwd);
	return join(planDir, DB_NAME);
}

/**
 * Get the plan directory path
 * First checks if .plan exists directly in cwd, then falls back to finding parent .plan
 */
export function getPlanDir(cwd: string = process.cwd()): string {
	// Check if plan dir exists directly in cwd
	const directPlanDir = join(cwd, PLAN_DIR);
	if (existsSync(directPlanDir)) {
		return directPlanDir;
	}
	// Try to find parent .plan directory
	const root = findProjectRootNoCache(cwd);
	if (root) {
		return join(root, PLAN_DIR);
	}
	// For init: return direct path to create in provided cwd
	return directPlanDir;
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

	// Initialize migration system for new databases
	initMigrationSystem(db);

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

	// Run pending migrations
	runMigrations(db);

	return db;
}

/**
 * Close database connection
 */
export function closeDatabase(db: Database): void {
	db.close();
}
