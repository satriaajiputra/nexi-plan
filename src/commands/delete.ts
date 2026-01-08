import Database from "bun:sqlite";
import { getDatabase, closeDatabase, getDbPath } from "../db/client.js";
import { getTaskById, deleteTask as dbDeleteTask, countChildren } from "../db/queries.js";
import { success, info, parseTaskId } from "../utils/format.js";

export async function deleteTask(hashId: string, force: boolean = false, cwd?: string): Promise<void> {
  const dbPath = cwd ? getDbPath(cwd) : undefined;
  const db = getDatabase(dbPath);

  try {
    const actualId = parseTaskId(hashId);
    const task = getTaskById(db, actualId);

    if (!task) {
      info(`Task not found: ${hashId}`);
      return;
    }

    const childCount = countChildren(db, task.id);

    if (childCount > 0 && !force) {
      info(
        `This will delete task ${hashId} and its ${childCount} child task(s). Use --force to confirm.`
      );
      return;
    }

    dbDeleteTask(db, actualId);
    success(`Deleted task ${hashId}${childCount > 0 ? ` and ${childCount} child task(s)` : ""}`);
  } finally {
    closeDatabase(db);
  }
}
