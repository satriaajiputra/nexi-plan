import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { closeDatabase, initDatabase, clearProjectRootCache } from "../db/client.js";
import type { PlanConfig } from "../models/task.js";
import { savePlanConfig } from "../services/id.js";
import { AGENTS_TEMPLATE } from "../templates/agents.js";

export async function init(prefix: string = "np", cwd: string = process.cwd()): Promise<void> {
	// Construct plan directory path directly - don't search parent for init
	const planDir = join(cwd, ".plan");

	// Create .plan directory if it doesn't exist
	if (!existsSync(planDir)) {
		mkdirSync(planDir, { recursive: true });
	}

	// Initialize database
	try {
		const dbPath = join(planDir, "tasks.db");
		const db = initDatabase(dbPath);
		closeDatabase(db);
	} catch (err) {
		throw new Error(`Failed to initialize database: ${(err as Error).message}`);
	}

	// Save config
	const config: PlanConfig = {
		prefix,
		version: "1.0.0",
	};
	savePlanConfig(config, planDir);

	// Write AGENTS.md template
	const agentsPath = join(planDir, "../", "AGENTS.md");

	try {
		Bun.write(agentsPath, AGENTS_TEMPLATE);
	} catch (err) {
		throw new Error(`Failed to create AGENTS.md: ${(err as Error).message}`);
	}

	// Clear the cache so subsequent commands can find the newly created .plan
	clearProjectRootCache();

	console.log(
		`Created .plan/ directory with configuration (prefix: ${prefix}).`,
	);
	console.log(`Task ID format: ${prefix}-XXXXXX`);
}
