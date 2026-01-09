import Database from "bun:sqlite";
import type { Task, TaskInput, TaskUpdate, TaskStatus, TaskType } from "../models/task.js";

/**
 * Insert a new task
 */
export function insertTask(
  db: Database,
  input: TaskInput & { hash_id: string }
): Task {
  const query = db.query(`
    INSERT INTO tasks (hash_id, name, type, priority, convergence, description, parent_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    RETURNING id, hash_id, name, type, priority, status, convergence, description, parent_id, created_at, updated_at
  `);

  const result = query.get(
    input.hash_id,
    input.name,
    input.type,
    input.priority,
    1.0,
    input.description ?? null,
    input.parent_id ?? null
  ) as Task;

  query.finalize();
  return result;
}

/**
 * Get task by hash_id
 */
export function getTaskById(db: Database, hashId: string): Task | null {
  const query = db.query(`SELECT * FROM tasks WHERE hash_id = ?`);
  const result = query.get(hashId) as Task | null;
  query.finalize();
  return result;
}

/**
 * Get task by internal id
 */
export function getTaskByInternalId(db: Database, id: number): Task | null {
  const query = db.query(`SELECT * FROM tasks WHERE id = ?`);
  const result = query.get(id) as Task | null;
  query.finalize();
  return result;
}

/**
 * Get all tasks
 */
export function getAllTasks(db: Database): Task[] {
  const query = db.query(`SELECT * FROM tasks ORDER BY priority ASC, created_at ASC, id ASC`);
  const result = query.all() as Task[];
  query.finalize();
  return result;
}

/**
 * Get tasks by filter
 */
export function getTasksByFilter(
  db: Database,
  filters: {
    status?: TaskStatus;
    type?: TaskType;
    parent_id?: number | null;
    excludeStatus?: TaskStatus[];
  }
): Task[] {
  let sql = `SELECT * FROM tasks WHERE 1=1`;
  const params: (string | number)[] = [];

  if (filters.status) {
    sql += ` AND status = ?`;
    params.push(filters.status);
  }

  if (filters.type) {
    sql += ` AND type = ?`;
    params.push(filters.type);
  }

  if (filters.parent_id !== undefined) {
    sql += ` AND parent_id ${filters.parent_id === null ? "IS NULL" : "= ?"}`;
    if (filters.parent_id !== null) {
      params.push(filters.parent_id);
    }
  }

  if (filters.excludeStatus && filters.excludeStatus.length > 0) {
    const placeholders = filters.excludeStatus.map(() => "?").join(",");
    sql += ` AND (status IS NULL OR status NOT IN (${placeholders}))`;
    params.push(...filters.excludeStatus);
  }

  sql += ` ORDER BY priority ASC, created_at ASC, id ASC`;

  const query = db.query(sql);
  const result = query.all(...params) as Task[];
  query.finalize();
  return result;
}

/**
 * Get children of a task
 */
export function getChildTasks(db: Database, parentId: number): Task[] {
  const query = db.query(`SELECT * FROM tasks WHERE parent_id = ? ORDER BY priority ASC, created_at ASC, id ASC`);
  const result = query.all(parentId) as Task[];
  query.finalize();
  return result;
}

/**
 * Update task
 */
export function updateTask(db: Database, hashId: string, update: TaskUpdate): Task | null {
  const fields: string[] = [];
  const params: (string | number)[] = [];

  if (update.status !== undefined) {
    fields.push("status = ?");
    params.push(update.status);
  }

  if (update.convergence !== undefined) {
    fields.push("convergence = ?");
    params.push(update.convergence);
  }

  if (update.description !== undefined) {
    fields.push("description = ?");
    params.push(update.description);
  }

  if (update.name !== undefined) {
    fields.push("name = ?");
    params.push(update.name);
  }

  if (update.priority !== undefined) {
    fields.push("priority = ?");
    params.push(update.priority);
  }

  if (update.type !== undefined) {
    fields.push("type = ?");
    params.push(update.type);
  }

  if (fields.length === 0) {
    return getTaskById(db, hashId);
  }

  params.push(hashId);
  const sql = `UPDATE tasks SET ${fields.join(", ")} WHERE hash_id = ?`;

  const query = db.query(sql);
  query.run(...params);
  query.finalize();
  return getTaskById(db, hashId);
}

/**
 * Delete task by hash_id (cascades to children)
 */
export function deleteTask(db: Database, hashId: string): boolean {
  const query = db.query(`DELETE FROM tasks WHERE hash_id = ?`);
  const result = query.run(hashId);
  query.finalize();
  return result.changes > 0;
}

/**
 * Count children of a task
 */
export function countChildren(db: Database, parentId: number): number {
  const query = db.query(`SELECT COUNT(*) as count FROM tasks WHERE parent_id = ?`);
  const result = query.get(parentId) as { count: number };
  query.finalize();
  return result.count;
}

/**
 * Get all tasks for fuzzy search
 */
export function searchTasks(db: Database, searchTerm: string): Task[] {
  const query = db.query(`
    SELECT * FROM tasks
    WHERE name LIKE ? OR description LIKE ?
    ORDER BY priority ASC, created_at ASC, id ASC
  `);
  const pattern = `%${searchTerm}%`;
  const result = query.all(pattern, pattern) as Task[];
  query.finalize();
  return result;
}

/**
 * Get root tasks (no parent)
 */
export function getRootTasks(db: Database): Task[] {
  return getTasksByFilter(db, { parent_id: null });
}
