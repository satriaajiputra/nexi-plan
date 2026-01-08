import { test, expect, describe } from "bun:test";
import { type Task, TaskStatus, TaskType } from "../../src/models/task.ts";
import {
	findBestMatch,
	fuzzySearchTasks,
	matchesTaskId,
} from "../../src/services/fuzzy.ts";

describe("services/fuzzy", () => {
	const createTask = (name: string, description?: string): Task => ({
		id: 1,
		hash_id: `t-${name.toLowerCase().replace(/\s/g, "-")}`,
		name,
		type: TaskType.TASK,
		priority: 3,
		status: TaskStatus.PENDING,
		convergence: 1.0,
		description,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	});

	const tasks = [
		createTask("Login functionality"),
		createTask("User authentication"),
		createTask("Password reset"),
		createTask("Dashboard design"),
		createTask("API integration"),
	];

	describe("fuzzySearchTasks", () => {
		test("should return exact match with score 1.0", () => {
			const results = fuzzySearchTasks(tasks, "Login functionality");

			expect(results.length).toBeGreaterThan(0);
			expect(results[0]!.score).toBe(1);
			expect(results[0]!.task.name).toBe("Login functionality");
		});

		test("should return prefix match with score 0.9", () => {
			const results = fuzzySearchTasks(tasks, "Login");

			expect(results.length).toBeGreaterThan(0);
			expect(results[0]!.score).toBe(0.9);
		});

		test("should return contains match with score 0.8", () => {
			const results = fuzzySearchTasks(tasks, "auth");

			expect(results.length).toBeGreaterThan(0);
			expect(results[0]!.score).toBe(0.8);
		});

		test("should return results sorted by score descending", () => {
			const results = fuzzySearchTasks(tasks, "user");

			// Only "User authentication" contains "user"
			expect(results.length).toBe(1);
			for (let i = 1; i < results.length; i++) {
				expect(results[i - 1]!.score).toBeGreaterThanOrEqual(results[i]!.score);
			}
		});

		test("should filter out low scoring results", () => {
			const results = fuzzySearchTasks(tasks, "xyz123nonexistent");
			expect(results.length).toBe(0);
		});

		test("should search in description", () => {
			const tasksWithDesc = [
				createTask("Task One", "This is about login"),
				createTask("Task Two", "Authentication details"),
			];

			const results = fuzzySearchTasks(tasksWithDesc, "login");

			expect(results.length).toBeGreaterThan(0);
			expect(results[0]!.task.name).toBe("Task One");
		});

		test("should take max of name and description scores", () => {
			const tasksWithDesc = [
				createTask("Task One", "reset password info"), // query "password" is in desc (contains=0.8)
				createTask("Password reset", ""), // query "password" is in name (startsWith=0.9)
			];

			const results = fuzzySearchTasks(tasksWithDesc, "password");

			expect(results.length).toBe(2);
			// Second task should match better (0.9 startsWith > 0.8 contains)
			expect(results[0]!.task.name).toBe("Password reset");
		});

		test("should handle empty task list", () => {
			const results = fuzzySearchTasks([], "test");
			expect(results.length).toBe(0);
		});

		test("should handle empty query", () => {
			const results = fuzzySearchTasks(tasks, "");
			expect(results.length).toBe(0);
		});

		test("should be case insensitive", () => {
			const upperResults = fuzzySearchTasks(tasks, "LOGIN");
			const lowerResults = fuzzySearchTasks(tasks, "login");

			expect(upperResults.length).toBe(lowerResults.length);
		});

		test("should give bonus for word starts with query", () => {
			const results = fuzzySearchTasks(tasks, "pas");
			// "Password reset" starts with "pas"
			const passResult = results.find((r) => r.task.name === "Password reset");

			expect(passResult).toBeDefined();
			// Should have starts-with bonus on top of Levenshtein
			expect(passResult!.score).toBeGreaterThan(0.7);
		});
	});

	describe("findBestMatch", () => {
		test("should return single best match", () => {
			const result = findBestMatch(tasks, "auth");

			expect(result).not.toBeNull();
			expect(result!.name).toBe("User authentication");
		});

		test("should return null for no matches", () => {
			const result = findBestMatch(tasks, "nonexistentxyz");
			expect(result).toBeNull();
		});

		test("should return null for empty array", () => {
			const result = findBestMatch([], "test");
			expect(result).toBeNull();
		});

		test("should return exact match if exists", () => {
			const result = findBestMatch(tasks, "Login functionality");
			expect(result).not.toBeNull();
			expect(result!.name).toBe("Login functionality");
		});
	});

	describe("matchesTaskId", () => {
		test("should match exact task ID", () => {
			expect(matchesTaskId("t-login", "t-login")).toBe(true);
			expect(matchesTaskId("T-LOGIN", "t-login")).toBe(true);
		});

		test("should match prefix of task ID", () => {
			expect(matchesTaskId("t-log", "t-login-func")).toBe(true);
		});

		test("should not match non-matching IDs", () => {
			expect(matchesTaskId("t-abc", "t-xyz")).toBe(false);
		});

		test("should be case insensitive", () => {
			expect(matchesTaskId("T-LOGIN", "t-login")).toBe(true);
		});
	});
});
