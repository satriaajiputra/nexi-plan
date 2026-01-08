import Database from "bun:sqlite";
import { getDatabase, closeDatabase, getDbPath } from "../db/client.js";
import { getAllTasks } from "../db/queries.js";
import { fuzzySearchTasks } from "../services/fuzzy.js";
import { formatTask, info } from "../utils/format.js";

export async function find(query: string, cwd?: string): Promise<void> {
  const dbPath = cwd ? getDbPath(cwd) : undefined;
  const db = getDatabase(dbPath);

  try {
    const tasks = getAllTasks(db);
    const results = fuzzySearchTasks(tasks, query);

    if (results.length === 0) {
      info(`No tasks found matching "${query}"`);
      return;
    }

    console.log(`Found ${results.length} task(s):`);
    for (const { task, score } of results) {
      console.log(`  ${task.hash_id}: ${task.name} (${(score * 100).toFixed(0)}% match)`);
    }
  } finally {
    closeDatabase(db);
  }
}
