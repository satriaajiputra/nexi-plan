import { describe, expect, test } from "bun:test";
import { TaskType } from "../../src/models/task.ts";
import {
	cleanTaskName,
	detectFromName,
	detectPriority,
	detectTaskType,
	validateConvergence,
	validatePriority,
	validateStatus,
	validateTaskType,
} from "../../src/utils/detect.ts";

describe("utils/detect", () => {
	describe("detectTaskType", () => {
		test("should detect bug type from fix: prefix", () => {
			expect(detectTaskType("fix: login issue")).toBe(TaskType.BUG);
			expect(detectTaskType("FIX: login issue")).toBe(TaskType.BUG);
		});

		test("should detect bug type from bug: prefix", () => {
			expect(detectTaskType("bug: crash on startup")).toBe(TaskType.BUG);
		});

		test("should detect task type from feat: prefix", () => {
			expect(detectTaskType("feat: add dark mode")).toBe(TaskType.TASK);
			expect(detectTaskType("FEAT: add dark mode")).toBe(TaskType.TASK);
		});

		test("should detect task type from feature: prefix", () => {
			expect(detectTaskType("feature: user dashboard")).toBe(TaskType.TASK);
		});

		test("should detect epic type from epic: prefix", () => {
			expect(detectTaskType("epic: large feature")).toBe(TaskType.EPIC);
			expect(detectTaskType("EPIC: large feature")).toBe(TaskType.EPIC);
		});

		test("should return null for unrecognized prefixes", () => {
			expect(detectTaskType("simple task name")).toBeNull();
			expect(detectTaskType("urgent: something")).toBeNull();
		});
	});

	describe("detectPriority", () => {
		test("should detect priority 1 from urgent: prefix", () => {
			expect(detectPriority("urgent: critical bug")).toBe(1);
			expect(detectPriority("URGENT: critical bug")).toBe(1);
		});

		test("should detect priority 1 from critical: prefix", () => {
			expect(detectPriority("critical: security issue")).toBe(1);
		});

		test("should detect priority 1 from hotfix: prefix", () => {
			expect(detectPriority("hotfix: production bug")).toBe(1);
		});

		test("should detect priority 2 from important: prefix", () => {
			expect(detectPriority("important: feature request")).toBe(2);
			expect(detectPriority("IMPORTANT: feature request")).toBe(2);
		});

		test("should detect priority 2 from high: prefix", () => {
			expect(detectPriority("high: priority task")).toBe(2);
		});

		test("should detect priority 4 from low: prefix", () => {
			expect(detectPriority("low: nice to have")).toBe(4);
		});

		test("should detect priority 5 from optional: prefix", () => {
			expect(detectPriority("optional: future enhancement")).toBe(5);
		});

		test("should detect priority 5 from nice to have: prefix", () => {
			expect(detectPriority("nice to have: suggestion")).toBe(5);
		});

		test("should return null for unrecognized prefixes", () => {
			expect(detectPriority("simple task")).toBeNull();
			expect(detectPriority("fix: something")).toBeNull();
		});
	});

	describe("cleanTaskName", () => {
		test("should remove fix: prefix", () => {
			expect(cleanTaskName("fix: login bug")).toBe("Login bug");
		});

		test("should remove bug: prefix", () => {
			expect(cleanTaskName("bug: crash")).toBe("Crash");
		});

		test("should remove feat: prefix", () => {
			expect(cleanTaskName("feat: new feature")).toBe("New feature");
		});

		test("should remove feature: prefix", () => {
			expect(cleanTaskName("feature: dashboard")).toBe("Dashboard");
		});

		test("should remove epic: prefix", () => {
			expect(cleanTaskName("epic: big project")).toBe("Big project");
		});

		test("should remove urgent: prefix", () => {
			expect(cleanTaskName("urgent: critical")).toBe("Critical");
		});

		test("should remove critical: prefix", () => {
			expect(cleanTaskName("critical: issue")).toBe("Issue");
		});

		test("should remove hotfix: prefix", () => {
			expect(cleanTaskName("hotfix: bug")).toBe("Bug");
		});

		test("should remove important: prefix", () => {
			expect(cleanTaskName("important: task")).toBe("Task");
		});

		test("should remove high: prefix", () => {
			expect(cleanTaskName("high: priority")).toBe("Priority");
		});

		test("should remove low: prefix", () => {
			expect(cleanTaskName("low: priority")).toBe("Priority");
		});

		test("should remove optional: prefix", () => {
			expect(cleanTaskName("optional: feature")).toBe("Feature");
		});

		test("should remove nice to have: prefix", () => {
			expect(cleanTaskName("nice to have: feature")).toBe("Feature");
		});

		test("should handle multiple prefixes", () => {
			expect(cleanTaskName("urgent: fix: login bug")).toBe("Login bug");
		});

		test("should capitalize first letter", () => {
			expect(cleanTaskName("task name")).toBe("Task name");
			expect(cleanTaskName("another task")).toBe("Another task");
		});

		test("should handle empty string", () => {
			expect(cleanTaskName("")).toBe("");
		});

		test("should handle names without prefixes", () => {
			expect(cleanTaskName("Regular task")).toBe("Regular task");
		});
	});

	describe("detectFromName", () => {
		test("should detect type and clean name", () => {
			const result = detectFromName("fix: login bug");
			expect(result.type).toBe(TaskType.BUG);
			expect(result.cleanName).toBe("Login bug");
		});

		test("should detect priority and clean name", () => {
			const result = detectFromName("urgent: critical issue");
			expect(result.priority).toBe(1);
			expect(result.cleanName).toBe("Critical issue");
		});

		test("should detect both type and priority", () => {
			const result = detectFromName("urgent: fix: critical bug");
			expect(result.type).toBe(TaskType.BUG);
			expect(result.priority).toBe(1);
			expect(result.cleanName).toBe("Critical bug");
		});

		test("should return undefined for undetected values", () => {
			const result = detectFromName("Regular task");
			expect(result.type).toBeUndefined();
			expect(result.priority).toBeUndefined();
			expect(result.cleanName).toBe("Regular task");
		});
	});

	describe("validateTaskType", () => {
		test("should accept valid types", () => {
			expect(validateTaskType("epic")).toBe(true);
			expect(validateTaskType("task")).toBe(true);
			expect(validateTaskType("bug")).toBe(true);
		});

		test("should reject invalid types", () => {
			expect(validateTaskType("epics")).toBe(false);
			expect(validateTaskType("tasks")).toBe(false);
			expect(validateTaskType("feature")).toBe(false);
			expect(validateTaskType("")).toBe(false);
		});
	});

	describe("validatePriority", () => {
		test("should accept valid priorities 1-5", () => {
			expect(validatePriority(1)).toBe(true);
			expect(validatePriority(2)).toBe(true);
			expect(validatePriority(3)).toBe(true);
			expect(validatePriority(4)).toBe(true);
			expect(validatePriority(5)).toBe(true);
		});

		test("should reject invalid priorities", () => {
			expect(validatePriority(0)).toBe(false);
			expect(validatePriority(6)).toBe(false);
			expect(validatePriority(-1)).toBe(false);
			expect(validatePriority(1.5)).toBe(false);
			// 3.0 is effectively 3 (integer), so it should be valid
			expect(validatePriority(3.0)).toBe(true);
		});
	});

	describe("validateStatus", () => {
		test("should accept valid statuses", () => {
			expect(validateStatus("pending")).toBe(true);
			expect(validateStatus("in_progress")).toBe(true);
			expect(validateStatus("completed")).toBe(true);
			expect(validateStatus("blocked")).toBe(true);
			expect(validateStatus("cancelled")).toBe(true);
		});

		test("should reject invalid statuses", () => {
			expect(validateStatus("done")).toBe(false);
			expect(validateStatus("active")).toBe(false);
			expect(validateStatus("")).toBe(false);
		});
	});

	describe("validateConvergence", () => {
		test("should accept valid convergence values", () => {
			expect(validateConvergence(0)).toBe(true);
			expect(validateConvergence(0.5)).toBe(true);
			expect(validateConvergence(1)).toBe(true);
		});

		test("should reject invalid convergence values", () => {
			expect(validateConvergence(-0.1)).toBe(false);
			expect(validateConvergence(1.1)).toBe(false);
		});
	});
});
