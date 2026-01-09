import Database from "bun:sqlite";
import { getDatabase, closeDatabase, getDbPath } from "../db/client.js";
import { getTaskById, updateTask as dbUpdateTask, countChildren, getChildTasks } from "../db/queries.js";
import { propagateConvergence } from "../services/convergence.js";
import { snapToZero } from "../utils/convergence.js";
import { success, error, info, parseTaskId } from "../utils/format.js";
import { readDescription } from "../utils/fs.js";
import type { TaskStatus, Task } from "../models/task.js";

export interface UpdateOptions {
  status?: TaskStatus;
  convergence?: number;
  description?: string;
  stdin?: string;
  cwd?: string;
  force?: boolean;
}

/**
 * Get all descendants of a task recursively
 */
function getAllDescendants(db: Database, taskId: number): Task[] {
  const children = getChildTasks(db, taskId);
  let allDescendants: Task[] = [...children];
  for (const child of children) {
    allDescendants = [...allDescendants, ...getAllDescendants(db, child.id)];
  }
  return allDescendants;
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

      // Check for cascade to children when setting convergence to 1.0
      if (updates.convergence === 1.0) {
        const childCount = countChildren(db, task.id);

        if (childCount > 0 && !options.force) {
          info(
            `This will set convergence to 1.0 for task ${hashId} and ${childCount} descendant task(s). Use --force to confirm.`
          );
          return;
        }

        // Cascade to all descendants if force is set
        if (childCount > 0 && options.force) {
          const descendants = getAllDescendants(db, task.id);
          for (const desc of descendants) {
            dbUpdateTask(db, desc.hash_id, { convergence: 1.0 });
          }
          success(`Set convergence to 1.0 for ${hashId} and ${childCount} descendant task(s)`);
        }
      }
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
