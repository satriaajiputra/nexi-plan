import Database from "bun:sqlite";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { SCHEMA_SQL } from "./schema.js";

const PLAN_DIR = ".plan";
const DB_NAME = "tasks.db";

/**
 * Get the database path
 */
export function getDbPath(): string {
	return join(process.cwd(), PLAN_DIR, DB_NAME);
}

/**
 * Get the plan directory path
 */
export function getPlanDir(): string {
	return join(process.cwd(), PLAN_DIR);
}

/**
 * Check if plan directory exists
 */
export function planExists(): boolean {
	const path = getPlanDir();
	return existsSync(path);
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
