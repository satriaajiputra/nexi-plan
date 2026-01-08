import { updateTask } from "./update.js";
import { success } from "../utils/format.js";
import { TaskStatus } from "../models/task.js";

export async function done(hashId: string): Promise<void> {
  await updateTask(hashId, { status: TaskStatus.COMPLETED });
  success(`Task ${hashId} marked as completed`);
}
