import Database from "bun:sqlite";
import { getDatabase, closeDatabase, getDbPath } from "../db/client.js";
import { getTaskById, updateTask as dbUpdateTask, countChildren, getChildTasks } from "../db/queries.js";
import { propagateConvergence } from "../services/convergence.js";
import { snapToZero } from "../utils/convergence.js";
import { success, error, info, parseTaskId } from "../utils/format.js";
import { readDescription } from "../utils/fs.js";
import type { TaskStatus, Task, TaskPriority } from "../models/task.js";

export interface UpdateOptions {
  status?: TaskStatus;
  convergence?: number;
  priority?: TaskPriority;
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

export async function updateTask(hashIds: string | string[], options: UpdateOptions): Promise<void> {
  const ids = Array.isArray(hashIds) ? hashIds : [hashIds];

  if (ids.length === 0) {
    return;
  }

  const dbPath = options.cwd ? getDbPath(options.cwd) : undefined;
  const db = getDatabase(dbPath);

  try {
    // Track results for multi-task operations
    const results = {
      updated: [] as string[],
      notFound: [] as string[],
      failed: [] as string[],
    };

    for (const hashId of ids) {
      const actualId = parseTaskId(hashId);
      const task = getTaskById(db, actualId);

      if (!task) {
        results.notFound.push(hashId);
        continue;
      }

      const updates: { status?: TaskStatus; convergence?: number; priority?: TaskPriority; description?: string } = {};

      // Handle description
      if (options.description) {
        try {
          updates.description = readDescription(options.description, options.stdin);
        } catch (err) {
          error((err as Error).message);
          results.failed.push(hashId);
          continue;
        }
      }

      if (options.status !== undefined) {
        updates.status = options.status;
      }

      if (options.priority !== undefined) {
        updates.priority = options.priority;
      }

      if (options.convergence !== undefined) {
        updates.convergence = snapToZero(options.convergence);

        // Check for cascade to children when setting convergence to 1.0
        // Only applies to single task updates with --force
        if (updates.convergence === 1.0 && ids.length === 1) {
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
        results.updated.push(hashId);
      }
    }

    // Report results
    if (ids.length > 1) {
      reportMultiTaskResults(results);
    } else if (results.notFound.length > 0) {
      info(`Task not found: ${results.notFound[0]}`);
    } else if (results.updated.length > 0) {
      success(`Task ${results.updated[0]} updated`);
    }
  } finally {
    closeDatabase(db);
  }
}

/**
 * Report results for multi-task updates
 */
function reportMultiTaskResults(results: { updated: string[]; notFound: string[]; failed: string[] }): void {
  if (results.updated.length > 0) {
    success(`${results.updated.length} task(s) updated: ${results.updated.join(", ")}`);
  }
  if (results.notFound.length > 0) {
    info(`${results.notFound.length} task(s) not found: ${results.notFound.join(", ")}`);
  }
  if (results.failed.length > 0) {
    error(`${results.failed.length} task(s) failed to update: ${results.failed.join(", ")}`);
  }
}
