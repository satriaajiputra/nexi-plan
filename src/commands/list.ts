import Database from "bun:sqlite";
import { getDatabase, closeDatabase, getDbPath } from "../db/client.js";
import { getAllTasks, getTasksByFilter } from "../db/queries.js";
import { buildTaskTree, formatTaskNode, info } from "../utils/format.js";
import type { ListFilter, TaskType, TaskStatus } from "../models/task.js";

export interface ListOptions {
  wip?: boolean;
  focus?: boolean;
  type?: TaskType;
  cwd?: string;
}

export async function list(options: ListOptions = {}): Promise<void> {
  const dbPath = options.cwd ? getDbPath(options.cwd) : undefined;
  const db = getDatabase(dbPath);

  try {
    let tasks = getAllTasks(db);

    // Apply filters
    if (options.wip) {
      // Work-in-progress: tasks that have been started but not converged
      tasks = tasks.filter((t) => t.convergence < 1.0 && t.convergence > 0.01);
    }

    if (options.focus) {
      // High priority (1-2) and not blocked/cancelled
      tasks = tasks.filter(
        (t) => t.priority <= 2 && t.status !== "blocked" && t.status !== "cancelled"
      );
    }

    if (options.type) {
      tasks = tasks.filter((t) => t.type === options.type);
    }

    if (tasks.length === 0) {
      info("No tasks found.");
      return;
    }

    // Build and display tree
    const roots = buildTaskTree(tasks);

    for (const root of roots) {
      console.log(formatTaskNode(root));
      if (roots.indexOf(root) < roots.length - 1) {
        console.log();
      }
    }
  } finally {
    closeDatabase(db);
  }
}
