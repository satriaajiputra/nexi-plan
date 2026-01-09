/**
 * Task types supported by the task tracker
 */
export enum TaskType {
  EPIC = "epic",
  TASK = "task",
  BUG = "bug",
}

/**
 * Task statuses
 * Only BLOCKED and CANCELLED are explicit statuses.
 * All other states (pending, converged, not_converged) are derived from convergence value.
 */
export enum TaskStatus {
  BLOCKED = "blocked",
  CANCELLED = "cancelled",
}

/**
 * Task priority levels (1 = highest, 5 = lowest)
 */
export type TaskPriority = 1 | 2 | 3 | 4 | 5;

/**
 * Convergence weights by task type
 */
export const CONVERGENCE_WEIGHTS: Record<TaskType, number> = {
  [TaskType.EPIC]: 1.0,
  [TaskType.TASK]: 2.0,
  [TaskType.BUG]: 3.0,
};

/**
 * Task interface
 */
export interface Task {
  id: number;
  hash_id: string;
  name: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus | null;
  convergence: number;
  description?: string;
  parent_id?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Task input for creation
 */
export interface TaskInput {
  name: string;
  type: TaskType;
  priority: TaskPriority;
  description?: string;
  parent_id?: number;
}

/**
 * Task update options
 */
export interface TaskUpdate {
  status?: TaskStatus;
  convergence?: number;
  description?: string;
  name?: string;
  priority?: TaskPriority;
  type?: TaskType;
}

/**
 * Task tree node (includes children)
 */
export interface TaskNode extends Task {
  children: TaskNode[];
  depth: number;
}

/**
 * List filter options
 */
export interface ListFilter {
  status?: TaskStatus;
  type?: TaskType;
  wip?: boolean;
  focus?: boolean;
}

/**
 * Plan configuration
 */
export interface PlanConfig {
  prefix: string;
  version: string;
}
