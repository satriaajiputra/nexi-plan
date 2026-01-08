import { updateTask } from "./update.js";
import { success } from "../utils/format.js";
import { TaskStatus } from "../models/task.js";

export async function start(hashId: string, cwd?: string): Promise<void> {
  await updateTask(hashId, { status: TaskStatus.IN_PROGRESS, cwd });
  success(`Task ${hashId} marked as in_progress`);
}
