export const AGENTS_TEMPLATE = `# Task Tracking with \`np\`

This project uses \`np\` CLI for task tracking. When working on this project:

## Quick Reference

**Workflow Shortcuts:**
- \`np next\` - Show what to work on next
- \`np work <id>\` - View task + mark as in_progress
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
- \`np update --convergence <VALUE> <id>\` - Update convergence (use 0.005 to auto-complete)
- \`np done <id>\` - Just updates status to completed
- \`np del <id>\` - Delete task

## What is Convergence?

Convergence measures **how much work remains** on a task. It's a value from 0.0 to 1.0:

- **1.0** = Not started (100% work remaining)
- **0.5** = Halfway done (50% remaining)
- **0.0** = Completed (0% remaining)

**For AI agents:** Think of it as "effort remaining" rather than "progress made".

### Values Reference

| Value | Meaning |
|-------|--------|
| 1.0 | Not started |
| 0.7 | Just started |
| 0.5 | Halfway done |
| 0.3 | Almost done |
| <= 0.01 | Ready to complete |

### How to Complete a Task

When you're done with a task, run:

\`\`\`bash
np update <id> --convergence 0.005
\`\`\`

This sets convergence within the 0.01 threshold, which:
1. Snaps the value to 0.0
2. Automatically marks the task as completed

### Auto-Completion

When convergence reaches <= 0.01:
- The value is snapped to 0
- Status is automatically set to "completed"

This prevents floating-point issues from blocking completion.

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
5. When done: \`np update {{prefix}}-abc123 --convergence 0.005\` → Auto-completes the task (threshold <= 0.01)

## When to Block a Task

**Automatically run \`np block <id>\` when:**
- Same command fails 3+ times in a row
- Missing required credentials, env vars, or API keys
- User explicitly says "I can't help with that" or "that's not possible"
- You've asked for clarification twice and still don't have enough context

**Ask the user before blocking when:**
- Architectural choices or trade-offs ("Stripe or PayPal?")
- You're unsure which direction to take
- Missing context you could reasonably discover yourself

When blocked, always update the description with why:
\`\`\`bash
np update <id> -d "Blocked by: Need AWS credentials for deployment"
\`\`\`

## When Users Ask You to Create Tasks

Users may not know how to break down work. Help them by creating tasks proactively.

**User says something like:**
- "Help me add user authentication"
- "What tasks do we need for the payment feature?"
- "Create the tasks you think we need"
- "Break this down into subtasks"

**You should:**
1. Create an epic for the feature
2. Break it down into logical subtasks with \`--deps\`
3. Show the user the plan with \`np ls\`
4. Ask for adjustments if needed

**Example:**
\`\`\`bash
# User: "Help me add user authentication"
np add -n "epic: User Authentication"
# AI gets ID, then creates subtasks:
np add -n "Database schema for users" --deps <epic-id>
np add -n "Registration API endpoint" --deps <epic-id>
np add -n "Login API endpoint" --deps <epic-id>
# ... etc
\`\`\`

**When user lists multiple items:**
User says: "Create tasks for: fix login bug, add dark mode, update about page"

Create all at once:
\`\`\`bash
np add -n "fix: Login button not working on mobile"
np add -n "feat: Add dark mode toggle"
np add -n "feat: Update about page content"
\`\`\`

**When a task is too vague:**
If a task like "feat: User dashboard" has no description:
\`\`\`bash
np view <id>  # Check if it has details
# If not, ask or break it down:
np add -n "User profile card" --deps <id>
np add -n "Activity feed component" --deps <id>
# ... etc
\`\`\`

## Convergence Calculation

Parent task convergence is calculated as a weighted average of its children:

\`\`\`
Parent Convergence = Σ(Child Convergence × Child Weight) / Σ(Child Weights)
\`\`\`

**Weights:**
- Epic (1.0) - heavily influenced by children
- Task (2.0) - balanced influence
- Bug (3.0) - less impact on parent

**Note:** Cancelled tasks are excluded from the calculation.
`;
