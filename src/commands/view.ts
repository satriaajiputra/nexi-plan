import Database from "bun:sqlite";
import { getDatabase, closeDatabase } from "../db/client.js";
import { getTaskById, getChildTasks } from "../db/queries.js";
import { formatTaskDetails, info, parseTaskId } from "../utils/format.js";

export async function view(hashId: string): Promise<void> {
  const db = getDatabase();

  try {
    const actualId = parseTaskId(hashId);
    const task = getTaskById(db, actualId);

    if (!task) {
      info(`Task not found: ${hashId}`);
      return;
    }

    console.log(formatTaskDetails(task));

    // Show sub-tasks if any
    const children = getChildTasks(db, task.id);
    if (children.length > 0) {
      console.log("\nSub-tasks:");
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        console.log(`  ${i + 1}. ${child.hash_id}: ${child.name} (${child.status})`);
      }
    }
  } finally {
    closeDatabase(db);
  }
}
