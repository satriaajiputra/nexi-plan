import Database from "bun:sqlite";

/**
 * Database versions and their migration scripts
 *
 * Version history:
 * - v1: Initial schema (status: pending, in_progress, completed, blocked, cancelled)
 * - v2: Convergence-based status (status: null, blocked, cancelled; status derived from convergence)
 */
export const DB_VERSION = 2;

interface Migration {
	version: number;
	name: string;
	up: (db: Database) => void;
}

export const migrations: Migration[] = [
	{
		version: 2,
		name: "convergence_based_status",
		up: (db: Database) => {
			// SQLite doesn't support ALTER TABLE DROP COLUMN or RENAME COLUMN
			// So we need to: create new table, copy data, drop old table, rename new table
			db.exec("BEGIN TRANSACTION");

			try {
				// Step 1: Create new table with updated schema
				db.run(`
					CREATE TABLE tasks_new (
						id INTEGER PRIMARY KEY AUTOINCREMENT,
						hash_id TEXT NOT NULL UNIQUE,
						name TEXT NOT NULL,
						type TEXT NOT NULL CHECK(type IN ('epic', 'task', 'bug')),
						priority INTEGER NOT NULL CHECK(priority BETWEEN 1 AND 5),
						status TEXT CHECK(status IN ('blocked', 'cancelled')),
						convergence REAL NOT NULL DEFAULT 1.0 CHECK(convergence BETWEEN 0 AND 1),
						description TEXT,
						parent_id INTEGER,
						created_at TEXT NOT NULL DEFAULT (datetime('now')),
						updated_at TEXT NOT NULL DEFAULT (datetime('now')),
						FOREIGN KEY (parent_id) REFERENCES tasks_new(id) ON DELETE CASCADE
					)
				`);

				// Step 2: Copy data with status transformation
				// - 'blocked' → 'blocked'
				// - 'cancelled' → 'cancelled'
				// - 'pending' → NULL (derived from convergence === 1.0)
				// - 'in_progress' → NULL (derived from 0.01 < convergence < 1.0)
				// - 'completed' → NULL with convergence = 0.01
				db.exec(`
					INSERT INTO tasks_new (id, hash_id, name, type, priority, status, convergence, description, parent_id, created_at, updated_at)
					SELECT
						id,
						hash_id,
						name,
						type,
						priority,
						CASE
							WHEN status = 'blocked' THEN 'blocked'
							WHEN status = 'cancelled' THEN 'cancelled'
							ELSE NULL
						END,
						CASE
							WHEN status = 'completed' THEN 0.01
							ELSE convergence
						END,
						description,
						parent_id,
						created_at,
						updated_at
					FROM tasks
				`);

				// Step 3: Drop old table
				db.run(`DROP TABLE tasks`);

				// Step 4: Rename new table to original name
				db.run(`ALTER TABLE tasks_new RENAME TO tasks`);

				// Step 5: Recreate indexes
				db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_hash_id ON tasks(hash_id)`);
				db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id)`);
				db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`);
				db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type)`);

				// Step 6: Recreate trigger for timestamp updates
				db.run(`
					CREATE TRIGGER IF NOT EXISTS update_tasks_timestamp
					AFTER UPDATE ON tasks
					BEGIN
						UPDATE tasks SET updated_at = datetime('now') WHERE id = NEW.id;
					END
				`);

				db.exec("COMMIT");
				console.log("✓ Migrated to convergence-based status system");
			} catch (error) {
				db.exec("ROLLBACK");
				throw error;
			}
		},
	},
];

/**
 * Get current database version from user_version pragma
 */
export function getDbVersion(db: Database): number {
	const result = db.query("PRAGMA user_version").get() as { user_version: number };
	return result.user_version;
}

/**
 * Set database version
 */
export function setDbVersion(db: Database, version: number): void {
	db.run(`PRAGMA user_version = ${version}`);
}

/**
 * Run pending migrations
 */
export function runMigrations(db: Database): void {
	const currentVersion = getDbVersion(db);

	if (currentVersion >= DB_VERSION) {
		return; // Already up to date
	}

	console.log(`Migrating database from v${currentVersion} to v${DB_VERSION}...`);

	// Run migrations in order
	for (const migration of migrations) {
		if (migration.version > currentVersion && migration.version <= DB_VERSION) {
			console.log(`  Running: ${migration.name}...`);
			migration.up(db);
			setDbVersion(db, migration.version);
		}
	}

	console.log("✓ Migration complete!");
}

/**
 * Create migrations table (for future use with more complex migrations)
 * Currently using PRAGMA user_version for simplicity
 */
export function initMigrationSystem(db: Database): void {
	// Ensure user_version is set for new databases
	if (getDbVersion(db) === 0) {
		setDbVersion(db, DB_VERSION);
	}
}
