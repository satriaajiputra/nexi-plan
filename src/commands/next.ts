import Database from "bun:sqlite";
import { getDatabase, closeDatabase, getDbPath } from "../db/client.js";
import { getTasksByFilter } from "../db/queries.js";
import { formatTask, info } from "../utils/format.js";
import { TaskStatus } from "../models/task.js";

export async function next(cwd?: string): Promise<void> {
  const dbPath = cwd ? getDbPath(cwd) : undefined;
  const db = getDatabase(dbPath);

  try {
    // Get tasks that are not blocked or cancelled
    const tasks = getTasksByFilter(db, {
      excludeStatus: [TaskStatus.BLOCKED, TaskStatus.CANCELLED],
    });

    // Filter for priority 1-2 tasks that are not converged (convergence > 0.01)
    const candidates = tasks.filter(
      (t) => t.priority <= 2 && t.convergence > 0.01
    );

    if (candidates.length === 0) {
      info("No pending tasks found. All tasks are converged, blocked, or cancelled.");
      return;
    }

    // Sort by convergence (lowest first = most done), then priority, then date
    const topTask = candidates.sort((a, b) => {
      // Prefer tasks closer to convergence
      if (a.convergence !== b.convergence) return a.convergence - b.convergence;
      if (a.priority !== b.priority) return a.priority - b.priority;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    })[0];

    if (topTask) {
      console.log(`→ ${formatTask(topTask)}`);
    }
  } finally {
    closeDatabase(db);
  }
}
