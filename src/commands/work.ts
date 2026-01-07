import Database from "bun:sqlite";
import { getDatabase, closeDatabase } from "../db/client.js";
import { getTaskById, updateTask as dbUpdateTask } from "../db/queries.js";
import { propagateConvergence } from "../services/convergence.js";
import { formatTaskDetails, info, parseTaskId } from "../utils/format.js";
import { TaskStatus } from "../models/task.js";

export async function work(hashId: string): Promise<void> {
  const db = getDatabase();

  try {
    const actualId = parseTaskId(hashId);
    const task = getTaskById(db, actualId);

    if (!task) {
      info(`Task not found: ${hashId}`);
      return;
    }

    // Show task details
    console.log(formatTaskDetails(task));

    // Mark as in_progress
    dbUpdateTask(db, actualId, { status: TaskStatus.IN_PROGRESS });
    propagateConvergence(db, task.id);

    console.log(`\nTask ${hashId} marked as in_progress`);
  } finally {
    closeDatabase(db);
  }
}
