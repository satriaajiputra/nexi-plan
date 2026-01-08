import Database from "bun:sqlite";
import { getDatabase, closeDatabase, getDbPath } from "../db/client.js";
import { getTaskById, updateTask as dbUpdateTask } from "../db/queries.js";
import { propagateConvergence } from "../services/convergence.js";
import { snapToZero } from "../utils/convergence.js";
import { success, error, info, parseTaskId } from "../utils/format.js";
import { readDescription } from "../utils/fs.js";
import type { TaskStatus } from "../models/task.js";

export interface UpdateOptions {
  status?: TaskStatus;
  convergence?: number;
  description?: string;
  stdin?: string;
  cwd?: string;
}

export async function updateTask(hashId: string, options: UpdateOptions): Promise<void> {
  const dbPath = options.cwd ? getDbPath(options.cwd) : undefined;
  const db = getDatabase(dbPath);

  try {
    const actualId = parseTaskId(hashId);
    const task = getTaskById(db, actualId);

    if (!task) {
      info(`Task not found: ${hashId}`);
      return;
    }

    const updates: { status?: TaskStatus; convergence?: number; description?: string } = {};

    // Handle description
    if (options.description) {
      try {
        updates.description = readDescription(options.description, options.stdin);
      } catch (err) {
        error((err as Error).message);
        return;
      }
    }

    if (options.status !== undefined) {
      updates.status = options.status;
    }

    if (options.convergence !== undefined) {
      updates.convergence = snapToZero(options.convergence);
    }

    // Update task
    const updated = dbUpdateTask(db, actualId, updates);

    if (updated) {
      // Propagate convergence changes
      if (updates.convergence !== undefined || updates.status !== undefined) {
        propagateConvergence(db, updated.id);
      }

      success(`Task ${hashId} updated`);
    }
  } finally {
    closeDatabase(db);
  }
}
