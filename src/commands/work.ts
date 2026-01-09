import Database from "bun:sqlite";
import { getDatabase, closeDatabase, getDbPath } from "../db/client.js";
import { getTaskById } from "../db/queries.js";
import { formatTaskDetails, info, parseTaskId } from "../utils/format.js";

export async function work(hashId: string, cwd?: string): Promise<void> {
  const dbPath = cwd ? getDbPath(cwd) : undefined;
  const db = getDatabase(dbPath);

  try {
    const actualId = parseTaskId(hashId);
    const task = getTaskById(db, actualId);

    if (!task) {
      info(`Task not found: ${hashId}`);
      return;
    }

    // Show task details
    console.log(formatTaskDetails(task));
    console.log(`\nTask ${hashId} is ready to work on`);
  } finally {
    closeDatabase(db);
  }
}
