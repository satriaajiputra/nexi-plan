import { updateTask } from "./update.js";
import { success } from "../utils/format.js";
import { TaskStatus } from "../models/task.js";

export async function block(hashId: string): Promise<void> {
  await updateTask(hashId, { status: TaskStatus.BLOCKED });
  success(`Task ${hashId} marked as blocked`);
}
