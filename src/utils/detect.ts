import { type TaskPriority, TaskType } from "../models/task.js";

/**
 * Detect task type from name prefix
 * Patterns:
 * - "fix:" → bug
 * - "feat:" → task
 * - "epic:" → epic
 */
export function detectTaskType(name: string): TaskType | null {
	const lowerName = name.toLowerCase().trim();

	// Check for prefixes followed by colon
	const patterns: Array<{ pattern: string; type: TaskType }> = [
		{ pattern: "fix:", type: TaskType.BUG },
		{ pattern: "bug:", type: TaskType.BUG },
		{ pattern: "feat:", type: TaskType.TASK },
		{ pattern: "feature:", type: TaskType.TASK },
		{ pattern: "epic:", type: TaskType.EPIC },
	];

	for (const { pattern, type } of patterns) {
		if (lowerName.startsWith(pattern)) {
			return type;
		}
	}

	return null;
}

/**
 * Detect priority from name prefix
 * Patterns:
 * - "urgent:", "critical:", "hotfix:" → 1
 * - "important:", "high:" → 2
 * - "low:" → 4
 * - "optional:", "nice to have:" → 5
 */
export function detectPriority(name: string): TaskPriority | null {
	const lowerName = name.toLowerCase().trim();

	const patterns: Array<{ pattern: string; priority: TaskPriority }> = [
		{ pattern: "urgent:", priority: 1 },
		{ pattern: "critical:", priority: 1 },
		{ pattern: "hotfix:", priority: 1 },
		{ pattern: "important:", priority: 2 },
		{ pattern: "high:", priority: 2 },
		{ pattern: "low:", priority: 4 },
		{ pattern: "optional:", priority: 5 },
		{ pattern: "nice to have:", priority: 5 },
	];

	for (const { pattern, priority } of patterns) {
		if (lowerName.startsWith(pattern)) {
			return priority;
		}
	}

	return null;
}

/**
 * Clean task name by removing detected prefixes
 * Removes detection prefixes like "fix:", "urgent:", etc.
 */
export function cleanTaskName(name: string): string {
	let cleaned = name.trim();

	// Remove type prefixes
	const typePrefixes = ["fix:", "bug:", "feat:", "feature:", "epic:"];
	for (const prefix of typePrefixes) {
		if (cleaned.toLowerCase().startsWith(prefix)) {
			cleaned = cleaned.slice(prefix.length).trim();
			break;
		}
	}

	// Remove priority prefixes
	const priorityPrefixes = [
		"urgent:",
		"critical:",
		"hotfix:",
		"important:",
		"high:",
		"low:",
		"optional:",
		"nice to have:",
	];
	for (const prefix of priorityPrefixes) {
		if (cleaned.toLowerCase().startsWith(prefix)) {
			cleaned = cleaned.slice(prefix.length).trim();
			break;
		}
	}

	// Capitalize first letter
	if (cleaned.length > 0) {
		cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
	}

	return cleaned;
}

/**
 * Smart detection result
 */
export interface DetectionResult {
	type?: TaskType;
	priority?: TaskPriority;
	cleanName: string;
}

/**
 * Detect both type and priority from task name
 */
export function detectFromName(name: string): DetectionResult {
	const type = detectTaskType(name);
	const priority = detectPriority(name);
	const cleanName = cleanTaskName(name);

	return {
		type: type ?? undefined,
		priority: priority ?? undefined,
		cleanName,
	};
}

/**
 * Validate task type
 */
export function validateTaskType(type: string): type is TaskType {
	return ["epic", "task", "bug"].includes(type);
}

/**
 * Validate priority
 */
export function validatePriority(priority: number): priority is TaskPriority {
	return priority >= 1 && priority <= 5 && Number.isInteger(priority);
}

/**
 * Validate status
 */
export function validateStatus(status: string): boolean {
	return [
		"pending",
		"in_progress",
		"completed",
		"blocked",
		"cancelled",
	].includes(status);
}

/**
 * Validate convergence value
 */
export function validateConvergence(value: number): boolean {
	return value >= 0 && value <= 1;
}
