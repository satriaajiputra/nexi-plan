import Database from "bun:sqlite";
import { SCHEMA_SQL } from "../src/db/schema.ts";
import {
	type Task,
	type TaskPriority,
	TaskStatus,
	TaskType,
} from "../src/models/task.ts";

/**
 * Create an in-memory SQLite database with the correct schema
 */
export function createTestDb(): Database {
	const db = new Database(":memory:");
	db.run("PRAGMA foreign_keys = ON");
	db.run(SCHEMA_SQL);
	return db;
}

/**
 * Close and cleanup test database
 */
export function cleanupTestDb(db: Database): void {
	db.close();
}

/**
 * Default task values for test fixtures
 * Status is null by default (convergence-based)
 */
export const defaultTaskValues = {
	name: "Test Task",
	type: "task" as TaskType,
	priority: 3 as TaskPriority,
	status: null as TaskStatus | null,
	convergence: 1.0,
	description: undefined as string | undefined,
	parent_id: undefined as number | undefined,
};

/**
 * Create a test task with optional overrides
 */
export function createTestTask(
	db: Database,
	overrides: Partial<Task> = {},
): Task {
	const task = {
		...defaultTaskValues,
		hash_id: generateTestHashId(),
		...overrides,
	};

	// Build query dynamically based on whether status is provided
	const query = db.query(`
    INSERT INTO tasks (hash_id, name, type, priority, status, convergence, description, parent_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `);

	const result = query.get(
		task.hash_id,
		task.name,
		task.type,
		task.priority,
		task.status ?? null,
		task.convergence,
		task.description ?? null,
		task.parent_id ?? null,
	) as Task;

	query.finalize();
	return result;
}

/**
 * Generate a test hash ID
 */
let hashCounter = 0;
export function generateTestHashId(): string {
	hashCounter++;
	return `test-${hashCounter.toString(36).padStart(6, "0")}`;
}

/**
 * Get a test prefix for task IDs
 */
export function getTestPrefix(): string {
	return "test";
}

/**
 * Mock console output for testing
 */
export function mockConsole() {
	let logs: string[] = [];
	let errors: string[] = [];

	const originalLog = console.log;
	const originalError = console.error;

	console.log = (...args) => {
		logs.push(args.join(" "));
		originalLog(...args);
	};

	console.error = (...args) => {
		errors.push(args.join(" "));
		originalError(...args);
	};

	return {
		logs,
		errors,
		restore: () => {
			console.log = originalLog;
			console.error = originalError;
		},
		getOutput: () => logs.join("\n"),
		getErrorOutput: () => errors.join("\n"),
	};
}

/**
 * Capture console.log output only
 */
export function captureConsole() {
	const output = { value: "" };
	const originalLog = console.log;
	console.log = (...args: unknown[]) => {
		output.value += args.join(" ") + "\n";
	};
	return {
		get output() {
			return output.value;
		},
		restore: () => {
			console.log = originalLog;
		},
	};
}

/**
 * Create multiple test tasks in a hierarchy
 */
export function createTestTaskHierarchy(db: Database) {
	// Create parent epic
	const epic = createTestTask(db, {
		name: "Parent Epic",
		type: TaskType.EPIC,
		priority: 1,
	});

	// Create child task
	const childTask1 = createTestTask(db, {
		name: "Child Task 1",
		type: TaskType.TASK,
		priority: 2,
		parent_id: epic.id,
		convergence: 0.5,
	});

	// Create another child task
	const childTask2 = createTestTask(db, {
		name: "Child Task 2",
		type: TaskType.BUG,
		priority: 3,
		parent_id: epic.id,
		convergence: 1.0,
	});

	// Create grandchild
	const grandchild = createTestTask(db, {
		name: "Grandchild Task",
		type: TaskType.TASK,
		priority: 2,
		parent_id: childTask1.id,
		convergence: 0.0,
	});

	return { epic, childTask1, childTask2, grandchild };
}

/**
 * Create tasks with various statuses for testing filters
 */
export function createStatusTestTasks(db: Database) {
	const tasks: Task[] = [];

	tasks.push(
		createTestTask(db, {
			name: "Pending Task",
			status: null,
			convergence: 1.0,
			priority: 1,
		}),
	);
	tasks.push(
		createTestTask(db, {
			name: "Not Converged Task",
			status: null,
			convergence: 0.5,
			priority: 1,
		}),
	);
	tasks.push(
		createTestTask(db, {
			name: "Converged Task",
			status: null,
			convergence: 0.0,
			priority: 1,
		}),
	);
	tasks.push(
		createTestTask(db, {
			name: "Blocked Task",
			status: TaskStatus.BLOCKED,
			priority: 1,
		}),
	);
	tasks.push(
		createTestTask(db, {
			name: "Cancelled Task",
			status: TaskStatus.CANCELLED,
			priority: 1,
		}),
	);
	tasks.push(
		createTestTask(db, {
			name: "Low Priority Pending",
			status: null,
			convergence: 1.0,
			priority: 5,
		}),
	);

	return tasks;
}

/**
 * Create tasks with various types for testing type filters
 */
export function createTypeTestTasks(db: Database) {
	const tasks: Task[] = [];

	tasks.push(
		createTestTask(db, { name: "Epic Task", type: TaskType.EPIC, priority: 1 }),
	);
	tasks.push(
		createTestTask(db, {
			name: "Regular Task",
			type: TaskType.TASK,
			priority: 1,
		}),
	);
	tasks.push(
		createTestTask(db, { name: "Bug Task", type: TaskType.BUG, priority: 1 }),
	);

	return tasks;
}
