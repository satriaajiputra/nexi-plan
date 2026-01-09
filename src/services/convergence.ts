import Database from "bun:sqlite";
import { CONVERGENCE_WEIGHTS, type Task, TaskStatus, type TaskType } from "../models/task.js";
import { getChildTasks, getTaskByInternalId, updateTask } from "../db/queries.js";
import { snapToZero, isConverged } from "../utils/convergence.js";

/**
 * Calculate the convergence of a parent task based on its children
 * Uses weighted average based on task type weights
 */
export function calculateParentConvergence(db: Database, parentId: number): number {
  const children = getChildTasks(db, parentId);

  // Filter out cancelled tasks
  const activeChildren = children.filter((c) => c.status !== TaskStatus.CANCELLED);

  if (activeChildren.length === 0) {
    // No active children = completed convergence (0)
    return 0;
  }

  let weightedSum = 0;
  let totalWeight = 0;

  for (const child of activeChildren) {
    const weight = CONVERGENCE_WEIGHTS[child.type];
    weightedSum += child.convergence * weight;
    totalWeight += weight;
  }

  const result = totalWeight > 0 ? weightedSum / totalWeight : 0;
  return snapToZero(result);
}

/**
 * Propagate convergence changes up the task hierarchy
 * Updates all parent tasks recursively
 */
export function propagateConvergence(db: Database, taskId: number): void {
  const task = getTaskByInternalId(db, taskId);
  if (!task || !task.parent_id) {
    return;
  }

  // Get parent task to access its hash_id
  const parentTask = getTaskByInternalId(db, task.parent_id);
  if (!parentTask) {
    return;
  }

  // Calculate new convergence for parent
  const newConvergence = calculateParentConvergence(db, task.parent_id);

  // Update parent's convergence using hash_id
  updateTask(db, parentTask.hash_id, { convergence: newConvergence });

  // Recursively propagate up
  propagateConvergence(db, task.parent_id);
}

/**
 * Update task convergence and propagate to parents
 */
export function updateTaskConvergence(db: Database, hashId: string, convergence: number): void {
  const task = updateTask(db, hashId, { convergence });
  if (task) {
    propagateConvergence(db, task.id);
  }
}

/**
 * Recalculate convergence for a task and all its descendants
 */
export function recalculateTreeConvergence(db: Database, taskId: number): void {
  const task = getTaskByInternalId(db, taskId);
  if (!task) {
    return;
  }

  const children = getChildTasks(db, taskId);

  if (children.length === 0) {
    // Leaf task - convergence depends on status
    // This is typically set manually or based on completion
    return;
  }

  // Calculate convergence from children
  const newConvergence = calculateParentConvergence(db, taskId);
  updateTask(db, task.hash_id, { convergence: newConvergence });

  // Propagate up to parent
  if (task.parent_id) {
    propagateConvergence(db, taskId);
  }
}

/**
 * Get convergence weight for a task type
 */
export function getWeight(taskType: TaskType): number {
  return CONVERGENCE_WEIGHTS[taskType];
}

/**
 * Check if a task is a leaf (no children)
 */
export function isLeafTask(db: Database, taskId: number): boolean {
  const children = getChildTasks(db, taskId);
  return children.length === 0;
}
