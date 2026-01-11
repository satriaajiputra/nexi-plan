import Database from "bun:sqlite";
import { getDatabase, closeDatabase, getDbPath } from "../db/client.js";
import { insertTask, getTaskById, getChildTasks } from "../db/queries.js";
import { generateTaskId } from "../services/id.js";
import { recalculateTreeConvergence } from "../services/convergence.js";
import { detectFromName, cleanTaskName } from "../utils/detect.js";
import { success, error } from "../utils/format.js";
import { readDescription } from "../utils/fs.js";
import type { TaskType, TaskPriority } from "../models/task.js";

export interface AddOptions {
  name: string;
  type?: TaskType;
  priority?: TaskPriority;
  description?: string;
  deps?: string;
  stdin?: string;
  cwd?: string;
}

export async function add(options: AddOptions): Promise<void> {
  const dbPath = options.cwd ? getDbPath(options.cwd) : undefined;
  const db = getDatabase(dbPath);

  try {
    // Smart detection from name
    const detection = detectFromName(options.name);

    // Use detected values or provided values or defaults
    const type = options.type ?? detection.type ?? ("task" as TaskType);
    const priority = options.priority ?? detection.priority ?? 3;
    const name = detection.cleanName;

    // Handle description
    let description: string | undefined;
    if (options.description) {
      try {
        description = readDescription(options.description, options.stdin);
      } catch (err) {
        error((err as Error).message);
        return;
      }
    }

    // Handle parent dependency
    let parentId: number | undefined;
    if (options.deps) {
      const parentTask = getTaskById(db, options.deps);
      if (!parentTask) {
        error(`Parent task not found: ${options.deps}`);
        return;
      }
      parentId = parentTask.id;
    }

    // Generate task ID
    const hashId = generateTaskId(options.cwd);

    // Insert task
    const task = insertTask(db, {
      hash_id: hashId,
      name,
      type,
      priority,
      description,
      parent_id: parentId,
    });

    // Recalculate convergence for parent (which will also propagate up)
    if (parentId) {
      recalculateTreeConvergence(db, parentId);
    }

    // Calculate display ID with suffix if it has a parent
    let displayId = task.hash_id;
    if (parentId) {
      const siblings = getChildTasks(db, parentId);
      const position = siblings.findIndex((s) => s.hash_id === task.hash_id) + 1;
      displayId = `${task.hash_id}.${position}`;
    }

    success(`Task created with ID: ${displayId}`);
  } finally {
    closeDatabase(db);
  }
}
