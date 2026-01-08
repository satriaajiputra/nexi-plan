import { updateTask } from "./update.js";
import { success } from "../utils/format.js";
import { TaskStatus } from "../models/task.js";

export async function block(hashId: string, cwd?: string): Promise<void> {
  await updateTask(hashId, { status: TaskStatus.BLOCKED, cwd });
  success(`Task ${hashId} marked as blocked`);
}
