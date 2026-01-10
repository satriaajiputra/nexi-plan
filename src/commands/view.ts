import Database from "bun:sqlite";
import { getDatabase, closeDatabase, getDbPath } from "../db/client.js";
import { getTaskById, getChildTasks } from "../db/queries.js";
import { formatTaskDetails, info, parseTaskId, formatTaskStatus } from "../utils/format.js";

export async function view(hashIds: string | string[], cwd?: string): Promise<void> {
  const ids = Array.isArray(hashIds) ? hashIds : [hashIds];

  if (ids.length === 0) {
    return;
  }

  const dbPath = cwd ? getDbPath(cwd) : undefined;
  const db = getDatabase(dbPath);

  try {
    for (let i = 0; i < ids.length; i++) {
      const hashId = ids[i];
      const actualId = parseTaskId(hashId);
      const task = getTaskById(db, actualId);

      // Add separator between multiple tasks
      if (i > 0) {
        console.log("\n---\n");
      }

      if (!task) {
        info(`Task not found: ${hashId}`);
        continue;
      }

      console.log(formatTaskDetails(task));

      // Show sub-tasks if any
      const children = getChildTasks(db, task.id);
      if (children.length > 0) {
        console.log("\nSub-tasks:");
        for (let j = 0; j < children.length; j++) {
          const child = children[j];
          if (child) {
            const derivedStatus = formatTaskStatus(child.status, child.convergence);
            console.log(`  ${j + 1}. ${child.hash_id}: ${child.name} - ${child.convergence.toFixed(2)} (${derivedStatus})`);
          }
        }
      }
    }
  } finally {
    closeDatabase(db);
  }
}
