import Database from "bun:sqlite";
import { getDatabase, closeDatabase } from "../db/client.js";
import { getTasksByFilter } from "../db/queries.js";
import { formatTask, info } from "../utils/format.js";
import { TaskStatus } from "../models/task.js";

export async function next(): Promise<void> {
  const db = getDatabase();

  try {
    // Get high priority tasks that are not blocked, cancelled, or completed
    const tasks = getTasksByFilter(db, {
      excludeStatus: [TaskStatus.BLOCKED, TaskStatus.CANCELLED, TaskStatus.COMPLETED],
    });

    // Filter for priority 1-2 tasks that are pending or in_progress
    const candidates = tasks.filter(
      (t) => t.priority <= 2 && (t.status === TaskStatus.PENDING || t.status === TaskStatus.IN_PROGRESS)
    );

    if (candidates.length === 0) {
      // Show the highest priority pending task
      const pendingTasks = tasks.filter((t) => t.status === TaskStatus.PENDING);
      if (pendingTasks.length > 0) {
        const topTask = pendingTasks.sort((a, b) => a.priority - b.priority)[0];
        if (topTask) {
          console.log(`→ ${formatTask(topTask)}`);
        }
      } else {
        info("No pending tasks found. All tasks are completed, blocked, or cancelled.");
      }
      return;
    }

    // Show the top candidate
    const topTask = candidates.sort((a, b) => {
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
