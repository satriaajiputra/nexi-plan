import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { closeDatabase, getPlanDir, initDatabase, clearProjectRootCache } from "../db/client.js";
import type { PlanConfig } from "../models/task.js";
import { savePlanConfig } from "../services/id.js";

// Embedded AGENTS.md template
const AGENTS_TEMPLATE = `# Task Tracking with \`np\`

This project uses \`np\` CLI for task tracking. When working on this project:

## Quick Reference

**Workflow Shortcuts:**
- \`np next\` - Show what to work on next
- \`np work <id>\` - View task + mark as in_progress
- \`np done <id>\` - Mark as completed
- \`np start <id>\` - Mark as in_progress
- \`np block <id>\` - Mark as blocked

**Search & Navigate:**
- \`np find <query>\` - Search tasks
- \`np go <query>\` - Find + work on task
- \`np view <id>\` - View full task details (including plan/description)

**List Tasks:**
- \`np ls\` - List all tasks
- \`np ls --wip\` - Show only in_progress tasks
- \`np ls --focus\` - Show high-priority + unblocked tasks
- \`np ls --type <TYPE>\` - Filter by type

**Add Tasks:**
- \`np add -n "Task name" -t TYPE -p N\` - Add task
- Smart detection: "fix:" → bug, "feat:" → task, "epic:" → epic
- Auto-priority: "urgent" → 1, "important" → 2

**Full Commands:**
- \`np update --status <STATUS> <id>\` - Update status
- \`np update --convergence <VALUE> <id>\` - Update convergence
- \`np del <id>\` - Delete task

## Convergence Values

- 0.0 = Completed
- 0.3 = Mostly done
- 0.5 = In progress
- 0.7 = Started
- 1.0 = Not started

## Task Types

- **epic**: Large feature/initiative (weight: 1.0)
- **task**: Regular work item (weight: 2.0)
- **bug**: Bug fix (weight: 3.0)

## Priorities

- 1 = Highest (urgent, critical)
- 2 = High (important)
- 3 = Medium (default)
- 4 = Low
- 5 = Lowest (optional)

## Example AI Workflow

1. Ask user: "What should I work on?"
2. User says: "Implement task {{prefix}}-abc123"
3. Run: \`np work {{prefix}}-abc123\` → Shows details, marks as in_progress
4. Work on implementation
5. When done: \`np done {{prefix}}-abc123\` → Marks completed, sets convergence to 0

## Convergence Calculation

Parent task convergence is calculated as a weighted average of its children:

\`\`
Parent Convergence = Σ(Child Convergence × Child Weight) / Σ(Child Weights)
\`\`

This means:
- Epic tasks are heavily influenced by their children (weight 1.0)
- Bug fixes have less impact on parent convergence (weight 3.0)
- Completed tasks (convergence = 0) pull parent toward completion
`;

export async function init(prefix: string = "np"): Promise<void> {
	// Get plan directory path
	const planDir = getPlanDir();

	// Create .plan directory if it doesn't exist
	if (!existsSync(planDir)) {
		mkdirSync(planDir, { recursive: true });
	}

	// Initialize database
	try {
		const db = initDatabase();
		closeDatabase(db);
	} catch (err) {
		throw new Error(`Failed to initialize database: ${(err as Error).message}`);
	}

	// Save config
	const config: PlanConfig = {
		prefix,
		version: "1.0.0",
	};
	savePlanConfig(config);

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
