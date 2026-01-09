import type { Task, TaskNode, TaskStatus, TaskType } from "../models/task.js";

/**
 * Format task type as display string
 */
export function formatTaskType(type: TaskType): string {
  return type.toUpperCase();
}

/**
 * Format task status as display string
 * Status is derived from actual status and convergence value
 */
export function formatTaskStatus(status: TaskStatus | null, convergence: number): string {
  // Explicit statuses take precedence
  if (status === "blocked") return "blocked";
  if (status === "cancelled") return "cancelled";

  // Derive from convergence
  if (convergence <= 0.01) return "converged";
  if (convergence === 1.0) return "pending";
  return "not converged";
}

/**
 * Format convergence as raw value string
 */
export function formatConvergence(convergence: number): string {
  return convergence.toFixed(2);
}

/**
 * Parse task ID by removing any suffix (e.g., "np-abc.1" -> "np-abc")
 */
export function parseTaskId(taskId: string): string {
  const match = taskId.match(/^([a-zA-Z0-9-]+)\.?\d*$/);
  return match?.[1] ?? taskId;
}

/**
 * Format task for display in list
 */
export function formatTask(task: Task, showHashId: boolean = true, suffix?: number): string {
  const hashId = suffix !== undefined ? `${task.hash_id}.${suffix}` : task.hash_id;
  const prefix = showHashId ? `${hashId}: ` : "";
  const typeStr = `[${formatTaskType(task.type)}]`;
  const priorityStr = `(P${task.priority})`;
  const derivedStatus = formatTaskStatus(task.status, task.convergence);

  // Format: [hash_id]: [TYPE] name (P#) - 0.75 (not converged)
  return `${prefix}${typeStr} ${task.name} ${priorityStr} - ${formatConvergence(task.convergence)} (${derivedStatus})`;
}

/**
 * Format convergence value to string
 */
export function convergenceToString(convergence: number): string {
  return convergence.toFixed(2);
}

/**
 * Check if convergence is within auto-complete threshold
 */
export function isConvergenceConverged(convergence: number): boolean {
  return convergence <= 0.01;
}

/**
 * Format task with indentation for tree view
 */
export function formatTaskNode(node: TaskNode, indent: string = ""): string {
  const lines: string[] = [];
  const isLast = node.depth === 0;

  lines.push(`${indent}${formatTask(node)}`);

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (!child) continue;
    const isLastChild = i === node.children.length - 1;
    const childIndent = indent + (isLast ? "    " : "│   ");
    const prefix = indent + (isLastChild ? "└── " : "├── ");

    lines.push(`${prefix}${formatTask(child, true, i + 1)}`);

    for (const grandchild of child.children) {
      lines.push(formatTaskNodeRecursive(grandchild, childIndent));
    }
  }

  return lines.join("\n");
}

function formatTaskNodeRecursive(node: TaskNode, indent: string): string {
  const lines: string[] = [];
  const prefix = indent + (node.children.length === 0 ? "└── " : "├── ");

  lines.push(`${prefix}${formatTask(node)}`);

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (!child) continue;
    const isLastChild = i === node.children.length - 1;
    const childIndent = indent + (isLastChild ? "    " : "│   ");
    lines.push(formatTaskNodeRecursive(child, childIndent));
  }

  return lines.join("\n");
}

/**
 * Format full task details for view command
 */
export function formatTaskDetails(task: Task): string {
  const lines: string[] = [];

  lines.push(`=== ${task.hash_id}: ${task.name} ===`);
  lines.push(`Type: ${formatTaskType(task.type)}`);
  lines.push(`Priority: ${task.priority}`);
  lines.push(`Status: ${formatTaskStatus(task.status, task.convergence)}`);
  lines.push(`Convergence: ${formatConvergence(task.convergence)}`);

  if (task.parent_id) {
    lines.push(`Parent ID: ${task.parent_id}`);
  }

  if (task.description) {
    lines.push("");
    lines.push("Description:");
    lines.push(task.description);
  }

  lines.push("");
  lines.push(`Created: ${task.created_at}`);
  lines.push(`Updated: ${task.updated_at}`);

  return lines.join("\n");
}

/**
 * Build task tree from flat list
 */
export function buildTaskTree(tasks: Task[]): TaskNode[] {
  const map = new Map<number, TaskNode>();
  const roots: TaskNode[] = [];

  // Create nodes for all tasks
  for (const task of tasks) {
    map.set(task.id, { ...task, children: [], depth: 0 });
  }

  // Build tree structure
  for (const task of tasks) {
    const node = map.get(task.id)!;

    if (task.parent_id === null || task.parent_id === undefined) {
      roots.push(node);
    } else {
      const parent = map.get(task.parent_id);
      if (parent) {
        parent.children.push(node);
        node.depth = parent.depth + 1;
      } else {
        // Parent doesn't exist (orphan task) - treat as root
        roots.push(node);
      }
    }
  }

  // Sort by priority ASC, then by created date ASC, then by id ASC
  const sortNodes = (nodes: TaskNode[]) => {
    nodes.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      if (aTime !== bTime) {
        return aTime - bTime;
      }
      return a.id - b.id;
    });
    for (const node of nodes) {
      sortNodes(node.children);
    }
  };

  sortNodes(roots);

  return roots;
}

/**
 * Print success message
 */
export function success(message: string): void {
  console.log(`${message} ✓`);
}

/**
 * Print error message
 */
export function error(message: string): void {
  console.error(`Error: ${message}`);
}

/**
 * Print info message
 */
export function info(message: string): void {
  console.log(message);
}

/**
 * Print warning message
 */
export function warning(message: string): void {
  console.warn(`Warning: ${message}`);
}
