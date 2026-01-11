import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
	clearProjectRootCache,
	closeDatabase,
	initDatabase,
} from "../db/client.js";
import type { PlanConfig } from "../models/task.js";
import { savePlanConfig } from "../services/id.js";
import { AGENTS_TEMPLATE } from "../templates/agents.md.js";
import { CONVERGENCE_VERIFIER_CLAUDE_CODE_AGENT_TEMPLATE } from "../templates/claude-code/agents/convergence-verifier.md.js";
import { VERIFY_CONVERGENCE_CLAUDE_CODE_COMMAND_TEMPLATE } from "../templates/claude-code/commands/verify-convergence.md.js";

export async function init(
	prefix: string = "np",
	cwd: string = process.cwd(),
): Promise<void> {
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

	try {
		// Write AGENTS.md template
		const agentsPath = join(cwd, "AGENTS.md");
		Bun.write(agentsPath, AGENTS_TEMPLATE);

		// CLAUDE.md setup - backup existing and write new content
		const claudePath = join(cwd, "CLAUDE.md");
		if (existsSync(claudePath)) {
			copyFileSync(claudePath, join(cwd, "CLAUDE.bak.md"));
		}
		Bun.write(claudePath, AGENTS_TEMPLATE);

		// Claude Code agent setup
		const agentsDir = join(cwd, ".claude", "agents");
		mkdirSync(agentsDir, { recursive: true });
		const convergenceVerifierPath = join(agentsDir, "convergence-verifier.md");
		if (existsSync(convergenceVerifierPath)) {
			copyFileSync(convergenceVerifierPath, join(agentsDir, ".convergence-verifier.bak"));
		}
		Bun.write(
			convergenceVerifierPath,
			CONVERGENCE_VERIFIER_CLAUDE_CODE_AGENT_TEMPLATE,
		);

		// Claude Code command setup
		const commandsDir = join(cwd, ".claude", "commands");
		mkdirSync(commandsDir, { recursive: true });
		const verifyConvergencePath = join(commandsDir, "verify-convergence.md");
		if (existsSync(verifyConvergencePath)) {
			copyFileSync(verifyConvergencePath, join(commandsDir, ".verify-convergence.bak"));
		}
		Bun.write(
			verifyConvergencePath,
			VERIFY_CONVERGENCE_CLAUDE_CODE_COMMAND_TEMPLATE,
		);
	} catch (err) {
		throw new Error(`Failed to create templates: ${(err as Error).message}`);
	}

	// Clear the cache so subsequent commands can find the newly created .plan
	clearProjectRootCache();

	console.log(
		`Created .plan/ directory with configuration (prefix: ${prefix}).`,
	);
	console.log(`Task ID format: ${prefix}-XXXXXX`);
}
