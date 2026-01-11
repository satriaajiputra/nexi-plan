import Database from "bun:sqlite";
import { getDatabase, closeDatabase, getDbPath } from "../db/client.js";
import { getAllTasks, getTaskById } from "../db/queries.js";
import { recalculateTreeConvergence } from "../services/convergence.js";
import { success, info, parseTaskId } from "../utils/format.js";

export async function recalculate(hashIds?: string | string[], cwd?: string): Promise<void> {
  const dbPath = cwd ? getDbPath(cwd) : undefined;
  const db = getDatabase(dbPath);

  try {
    if (hashIds) {
      // Recalculate specific tasks
      const ids = Array.isArray(hashIds) ? hashIds : [hashIds];
      let count = 0;

      for (const hashId of ids) {
        const actualId = parseTaskId(hashId);
        const task = getTaskById(db, actualId);
        if (!task) {
          info(`Task not found: ${hashId}`);
          continue;
        }
        recalculateTreeConvergence(db, task.id);
        count++;
      }

      success(`Recalculated convergence for ${count} task(s)`);
    } else {
      // Recalculate all root tasks (which will cascade to all children)
      const tasks = getAllTasks(db);
      const rootTasks = tasks.filter((t) => t.parent_id === null);

      for (const root of rootTasks) {
        recalculateTreeConvergence(db, root.id);
      }

      success(`Recalculated convergence for ${rootTasks.length} root task(s)`);
    }
  } finally {
    closeDatabase(db);
  }
}
