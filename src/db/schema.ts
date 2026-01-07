/**
 * Database schema for task tracking
 * This file is bundled into the compiled binary
 */
export const SCHEMA_SQL = `
-- Tasks table with hierarchical support
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hash_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('epic', 'task', 'bug')),
    priority INTEGER NOT NULL CHECK(priority BETWEEN 1 AND 5),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'blocked', 'cancelled')),
    convergence REAL NOT NULL DEFAULT 1.0 CHECK(convergence BETWEEN 0 AND 1),
    description TEXT,
    parent_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_hash_id ON tasks(hash_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type);

-- Trigger to update timestamp on row update
CREATE TRIGGER IF NOT EXISTS update_tasks_timestamp
AFTER UPDATE ON tasks
BEGIN
    UPDATE tasks SET updated_at = datetime('now') WHERE id = NEW.id;
END;
`;
