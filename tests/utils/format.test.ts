import { test, expect, describe } from "bun:test";
import {
  formatTaskType,
  formatTaskStatus,
  formatConvergence,
  parseTaskId,
  formatTask,
  formatTaskNode,
  formatTaskDetails,
  buildTaskTree,
  convergenceToString,
  isConvergenceConverged,
} from "../../src/utils/format.ts";
import { TaskType, TaskStatus, type Task, type TaskNode } from "../../src/models/task.ts";

describe("utils/format", () => {
  describe("formatTaskType", () => {
    test("should format epic as EPIC", () => {
      expect(formatTaskType(TaskType.EPIC)).toBe("EPIC");
    });

    test("should format task as TASK", () => {
      expect(formatTaskType(TaskType.TASK)).toBe("TASK");
    });

    test("should format bug as BUG", () => {
      expect(formatTaskType(TaskType.BUG)).toBe("BUG");
    });
  });

  describe("formatTaskStatus", () => {
    test("should format pending", () => {
      expect(formatTaskStatus(TaskStatus.PENDING)).toBe("pending");
    });

    test("should format in_progress", () => {
      expect(formatTaskStatus(TaskStatus.IN_PROGRESS)).toBe("in_progress");
    });

    test("should format completed", () => {
      expect(formatTaskStatus(TaskStatus.COMPLETED)).toBe("completed");
    });

    test("should format blocked", () => {
      expect(formatTaskStatus(TaskStatus.BLOCKED)).toBe("blocked");
    });

    test("should format cancelled", () => {
      expect(formatTaskStatus(TaskStatus.CANCELLED)).toBe("cancelled");
    });
  });

  describe("formatConvergence", () => {
    test("should calculate 100% for 0 convergence", () => {
      expect(formatConvergence(0)).toBe("100%");
    });

    test("should calculate 50% for 0.5 convergence", () => {
      expect(formatConvergence(0.5)).toBe("50%");
    });

    test("should calculate 0% for 1.0 convergence", () => {
      expect(formatConvergence(1)).toBe("0%");
    });

    test("should round percentage", () => {
      expect(formatConvergence(0.333)).toBe("67%");
    });
  });

  describe("convergenceToString", () => {
    test("should format with 2 decimal places", () => {
      expect(convergenceToString(0.5)).toBe("0.50");
      expect(convergenceToString(0.123456)).toBe("0.12");
    });
  });

  describe("isConvergenceConverged", () => {
    test("should return true for converged values", () => {
      expect(isConvergenceConverged(0)).toBe(true);
      expect(isConvergenceConverged(0.01)).toBe(true);
    });

    test("should return false for non-converged values", () => {
      expect(isConvergenceConverged(0.011)).toBe(false);
      expect(isConvergenceConverged(1)).toBe(false);
    });
  });

  describe("parseTaskId", () => {
    test("should parse simple ID", () => {
      expect(parseTaskId("np-abc123")).toBe("np-abc123");
    });

    test("should parse ID with suffix", () => {
      expect(parseTaskId("np-abc123.1")).toBe("np-abc123");
    });

    test("should parse ID with suffix and multiple digits", () => {
      expect(parseTaskId("np-abc123.10")).toBe("np-abc123");
    });

    test("should handle ID with only numbers after dot", () => {
      expect(parseTaskId("np-abc123.42")).toBe("np-abc123");
    });

    test("should return original if no match", () => {
      expect(parseTaskId("invalid")).toBe("invalid");
    });
  });

  describe("formatTask", () => {
    const createTask = (overrides: Partial<Task> = {}): Task => ({
      id: 1,
      hash_id: "np-abc123",
      name: "Test Task",
      type: TaskType.TASK,
      priority: 3,
      status: TaskStatus.PENDING,
      convergence: 1.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    });

    test("should format task with hash ID", () => {
      const task = createTask();
      const result = formatTask(task);
      expect(result).toContain("np-abc123:");
      expect(result).toContain("[TASK]");
      expect(result).toContain("(P3)");
      expect(result).toContain("[pending]");
      expect(result).toContain("Test Task");
    });

    test("should format task without hash ID", () => {
      const task = createTask();
      const result = formatTask(task, false);
      expect(result).not.toContain("np-abc123:");
      expect(result).toContain("Test Task");
    });

    test("should show convergence percentage", () => {
      const task = createTask({ convergence: 0.5 });
      const result = formatTask(task);
      expect(result).toContain("50%");
    });

    test("should add ready indicator for converged tasks", () => {
      const task = createTask({ convergence: 0.0 });
      const result = formatTask(task);
      expect(result).toContain("*");
    });

    test("should not add ready indicator for non-converged tasks", () => {
      const task = createTask({ convergence: 1.0 });
      const result = formatTask(task);
      expect(result).not.toContain("*");
    });

    test("should include suffix when provided", () => {
      const task = createTask();
      const result = formatTask(task, true, 2);
      expect(result).toContain("np-abc123.2");
    });
  });

  describe("buildTaskTree", () => {
    test("should build flat tree for root-only tasks", () => {
      const tasks: Task[] = [
        { id: 1, hash_id: "t1", name: "Task 1", type: TaskType.TASK, priority: 3, status: TaskStatus.PENDING, convergence: 1.0, created_at: "", updated_at: "" },
        { id: 2, hash_id: "t2", name: "Task 2", type: TaskType.TASK, priority: 3, status: TaskStatus.PENDING, convergence: 1.0, created_at: "", updated_at: "" },
      ];

      const tree = buildTaskTree(tasks);
      expect(tree).toHaveLength(2);
      expect(tree[0]!.children).toHaveLength(0);
      expect(tree[1]!.children).toHaveLength(0);
    });

    test("should build hierarchical tree", () => {
      const tasks: Task[] = [
        { id: 1, hash_id: "p1", name: "Parent", type: TaskType.EPIC, priority: 1, status: TaskStatus.PENDING, convergence: 1.0, created_at: "", updated_at: "" },
        { id: 2, hash_id: "c1", name: "Child 1", type: TaskType.TASK, priority: 2, status: TaskStatus.PENDING, convergence: 1.0, parent_id: 1, created_at: "", updated_at: "" },
        { id: 3, hash_id: "c2", name: "Child 2", type: TaskType.TASK, priority: 3, status: TaskStatus.PENDING, convergence: 1.0, parent_id: 1, created_at: "", updated_at: "" },
      ];

      const tree = buildTaskTree(tasks);
      expect(tree).toHaveLength(1);
      expect(tree[0]!.hash_id).toBe("p1");
      expect(tree[0]!.children).toHaveLength(2);
      expect(tree[0]!.children[0]!.hash_id).toBe("c1");
      expect(tree[0]!.children[1]!.hash_id).toBe("c2");
    });

    test("should handle multiple levels of nesting", () => {
      const tasks: Task[] = [
        { id: 1, hash_id: "root", name: "Root", type: TaskType.EPIC, priority: 1, status: TaskStatus.PENDING, convergence: 1.0, created_at: "", updated_at: "" },
        { id: 2, hash_id: "child1", name: "Child 1", type: TaskType.TASK, priority: 2, status: TaskStatus.PENDING, convergence: 1.0, parent_id: 1, created_at: "", updated_at: "" },
        { id: 3, hash_id: "grandchild", name: "Grandchild", type: TaskType.TASK, priority: 3, status: TaskStatus.PENDING, convergence: 1.0, parent_id: 2, created_at: "", updated_at: "" },
      ];

      const tree = buildTaskTree(tasks);
      expect(tree).toHaveLength(1);
      expect(tree[0]!.children[0]!.children).toHaveLength(1);
      expect(tree[0]!.children[0]!.children[0]!.hash_id).toBe("grandchild");
    });

    test("should set depth correctly", () => {
      const tasks: Task[] = [
        { id: 1, hash_id: "root", name: "Root", type: TaskType.EPIC, priority: 1, status: TaskStatus.PENDING, convergence: 1.0, created_at: "", updated_at: "" },
        { id: 2, hash_id: "child", name: "Child", type: TaskType.TASK, priority: 2, status: TaskStatus.PENDING, convergence: 1.0, parent_id: 1, created_at: "", updated_at: "" },
      ];

      const tree = buildTaskTree(tasks);
      expect(tree[0]!.depth).toBe(0);
      expect(tree[0]!.children[0]!.depth).toBe(1);
    });

    test("should sort by priority", () => {
      const tasks: Task[] = [
        { id: 1, hash_id: "p1", name: "P1", type: TaskType.EPIC, priority: 3, status: TaskStatus.PENDING, convergence: 1.0, created_at: "", updated_at: "" },
        { id: 2, hash_id: "p2", name: "P2", type: TaskType.EPIC, priority: 1, status: TaskStatus.PENDING, convergence: 1.0, created_at: "", updated_at: "" },
        { id: 3, hash_id: "p3", name: "P3", type: TaskType.EPIC, priority: 2, status: TaskStatus.PENDING, convergence: 1.0, created_at: "", updated_at: "" },
      ];

      const tree = buildTaskTree(tasks);
      expect(tree[0]!.priority).toBe(1);
      expect(tree[1]!.priority).toBe(2);
      expect(tree[2]!.priority).toBe(3);
    });

    test("should handle orphan tasks (missing parent)", () => {
      const tasks: Task[] = [
        { id: 1, hash_id: "orphan", name: "Orphan", type: TaskType.TASK, priority: 1, status: TaskStatus.PENDING, convergence: 1.0, parent_id: 999, created_at: "", updated_at: "" },
      ];

      const tree = buildTaskTree(tasks);
      expect(tree).toHaveLength(1);
      expect(tree[0]!.hash_id).toBe("orphan");
    });
  });

  describe("formatTaskNode", () => {
    test("should format single node", () => {
      const node: TaskNode = {
        id: 1, hash_id: "t1", name: "Task", type: TaskType.TASK, priority: 3,
        status: TaskStatus.PENDING, convergence: 1.0, created_at: "", updated_at: "", children: [], depth: 0
      };
      const result = formatTaskNode(node);
      expect(result).toContain("Task");
      expect(result).toContain("t1");
    });

    test("should format tree with children", () => {
      const child: TaskNode = {
        id: 2, hash_id: "c1", name: "Child", type: TaskType.TASK, priority: 3,
        status: TaskStatus.PENDING, convergence: 1.0, created_at: "", updated_at: "", children: [], depth: 1
      };
      const node: TaskNode = {
        id: 1, hash_id: "p1", name: "Parent", type: TaskType.EPIC, priority: 1,
        status: TaskStatus.PENDING, convergence: 1.0, created_at: "", updated_at: "", children: [child], depth: 0
      };
      const result = formatTaskNode(node);
      expect(result).toContain("Parent");
      expect(result).toContain("Child");
    });
  });

  describe("formatTaskDetails", () => {
    test("should format task details", () => {
      const task: Task = {
        id: 1, hash_id: "np-abc", name: "Test Task", type: TaskType.TASK,
        priority: 3, status: TaskStatus.PENDING, convergence: 0.75,
        description: "A test description", created_at: "2024-01-01", updated_at: "2024-01-02"
      };
      const result = formatTaskDetails(task);
      expect(result).toContain("np-abc");
      expect(result).toContain("Test Task");
      expect(result).toContain("TASK");
      expect(result).toContain("3");
      expect(result).toContain("pending");
      expect(result).toContain("0.75");
      expect(result).toContain("A test description");
      expect(result).toContain("2024-01-01");
    });

    test("should show ready to complete for converged tasks", () => {
      const task: Task = {
        id: 1, hash_id: "np-abc", name: "Test", type: TaskType.TASK, priority: 3,
        status: TaskStatus.PENDING, convergence: 0.0, created_at: "", updated_at: ""
      };
      const result = formatTaskDetails(task);
      expect(result).toContain("(ready to complete)");
    });

    test("should not show parent_id if undefined", () => {
      const task: Task = {
        id: 1, hash_id: "np-abc", name: "Test", type: TaskType.TASK, priority: 3,
        status: TaskStatus.PENDING, convergence: 1.0, created_at: "", updated_at: ""
      };
      const result = formatTaskDetails(task);
      expect(result).not.toContain("Parent ID");
    });

    test("should show parent_id if set", () => {
      const task: Task = {
        id: 2, hash_id: "np-abc", name: "Test", type: TaskType.TASK, priority: 3,
        status: TaskStatus.PENDING, convergence: 1.0, parent_id: 1, created_at: "", updated_at: ""
      };
      const result = formatTaskDetails(task);
      expect(result).toContain("Parent ID: 1");
    });
  });
});
