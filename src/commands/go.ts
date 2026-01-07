import Database from "bun:sqlite";
import { getDatabase, closeDatabase } from "../db/client.js";
import { getTaskById, getAllTasks } from "../db/queries.js";
import { findBestMatch, matchesTaskId } from "../services/fuzzy.js";
import { work } from "./work.js";
import { info, parseTaskId } from "../utils/format.js";

export async function go(query: string): Promise<void> {
  const db = getDatabase();

  try {
    // First, try to find by exact task ID (handle suffix like ".1")
    const actualQuery = parseTaskId(query);
    const tasks = getAllTasks(db);
    let targetTask: Awaited<ReturnType<typeof getTaskById>> | null = null;

    for (const task of tasks) {
      if (matchesTaskId(actualQuery, task.hash_id)) {
        targetTask = task;
        break;
      }
    }

    // If not found by ID, use fuzzy search
    if (!targetTask) {
      targetTask = findBestMatch(tasks, query);
    }

    if (!targetTask) {
      info(`No tasks found matching "${query}"`);
      return;
    }

    closeDatabase(db);

    // Work on the found task
    await work(targetTask.hash_id);
  } catch (err) {
    info(`Error: ${(err as Error).message}`);
  }
}
