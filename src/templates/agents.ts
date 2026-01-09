export const AGENTS_TEMPLATE = `# Task Tracking with \`np\`

This project uses \`np\` CLI for task tracking. When working on this project:

## Quick Reference

**Workflow Shortcuts:**
- \`np next\` - Show what to work on next
- \`np work <id>\` - View task details
- \`np block <id>\` - Mark as blocked

**Search & Navigate:**
- \`np find <query>\` - Search tasks
- \`np go <query>\` - Find + work on task
- \`np view <id>\` - View full task details (including plan/description)

**List Tasks:**
- \`np ls\` - List all tasks
- \`np ls --wip\` - Show work-in-progress tasks (convergence < 1.0 && > 0.01)
- \`np ls --focus\` - Show high-priority + unblocked tasks
- \`np ls --type <TYPE>\` - Filter by type

**Add Tasks:**
- \`np add -n "Task name" -t TYPE -p N\` - Add task
- Smart detection: "fix:" → bug, "feat:" → task, "epic:" → epic
- Auto-priority: "urgent" → 1, "important" → 2

**Full Commands:**
- \`np update --status <STATUS> <id>\` - Update status (blocked, cancelled)
- \`np update --convergence <VALUE> <id>\` - Update convergence
- \`np del <id>\` - Delete task

## Convergence: A Clear Mental Model

**Convergence = Work Remaining (0.01 to 1.0)**

Think of convergence as "how much work is left," NOT "how much progress has been made."

- **1.0** = 100% work remaining (not started)
- **0.5** = 50% work remaining (halfway done)
- **0.01** = ~1% work remaining (complete)

**The Rule:** Only convergence ≤ 0.01 means "complete." Any value > 0.01 means "work remains."

### Canonical Examples

| Convergence | Work Remaining | How to Describe It |
|-------------|----------------|-------------------|
| 0.9 | 90% | "0.9 convergence (90% work remaining)" |
| 0.5 | 50% | "0.5 convergence (50% work remaining)" |
| 0.11 | 11% | "0.11 convergence (11% work remaining)" |
| 0.05 | 5% | "0.05 convergence (5% work remaining)" |
| 0.01 | ~1% | "Complete" or "Converged" |

**Pattern:** Always describe convergence as "X = Y% work remaining." This keeps the mental model clear.

### Common Mistake Pattern

When you see a low convergence value like 0.11, your intuition might say "that's close to zero, so it's basically done." **This is wrong.**

**Correct interpretation:**
- 0.11 means "11% of the work remains"
- 11% is not zero—it's a meaningful amount of work
- Only 0.01 or lower means "done"

**Before describing a task as complete, ask yourself:** Is the convergence ≤ 0.01? If not, the task is not complete.

### Completion Checklist

Before setting convergence to 0.01, verify:

- [ ] Code written and compiles/runs without errors
- [ ] Tested and confirmed working
- [ ] All related tests pass
- [ ] No obvious bugs or TODOs remaining

If ANY checkbox is "NO," do not set convergence to 0.01.

## Task Status

Tasks have two explicit statuses:
- **blocked** - Task cannot proceed (e.g., waiting on dependencies)
- **cancelled** - Task is no longer relevant

All other states are derived from convergence:
- **converged** - convergence ≤ 0.01 (complete)
- **not converged** - 0.01 < convergence < 1.0 (work in progress)
- **pending** - convergence === 1.0 (not started)

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
3. Run: \`np work {{prefix}}-abc123\` → Shows task details
4. Work on implementation
5. When done: \`np update {{prefix}}-abc123 --convergence 0.01\` → Mark as converged

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
