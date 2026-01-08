# Common Workflows for Vibe Coders

Real-world examples of how to use `np` when working with AI coding agents like Claude Code. These are scenarios you'll actually encounter—copy, paste, or adapt them.

---

## The Setup

```bash
# One-time setup in your project
cd /path/to/your/project
np init myproject

# Creates:
# - .plan/tasks.db    (SQLite database)
# - .plan/config.json (prefix config)
# - AGENTS.md         (instructions for AI)
```

After initialization, tell your AI: "Check AGENTS.md for how I track tasks."

---

## Scenario 1: "I Have an Idea"

You're chatting with Claude Code and think of something new.

**You say:**
> "Can you add a feature to export data as CSV?"

**AI creates:**
```bash
np add -n "feat: Export data as CSV" -d "Add CSV export functionality"
```

**What happens:**
- Auto-detects `feat:` → type=task
- ID like `mp-abc123` is generated
- Appears in `np ls`

**You check:**
```bash
np ls
→ mp-abc123: feat: Export data as CSV (pending)
```

---

## Scenario 2: "Something's Broken"

You notice a bug while testing.

**You say:**
> "The login button isn't working on mobile"

**AI creates:**
```bash
np add -n "fix: Login button not working on mobile" -d "Button tap event not firing on touch devices"
```

**What happens:**
- Auto-detects `fix:` → type=bug
- High visibility in `np ls --type bug`

**You check:**
```bash
np ls --type bug
→ mp-xyz789: fix: Login button not working on mobile (pending)
```

---

## Scenario 3: Starting Your Session

You come back to continue working with your AI.

**AI does at session start:**
```bash
np next
→ mp-abc123: feat: Export data as CSV (priority 2, pending)
```

**Then:**
```bash
np work mp-abc123
```

**What you see:** The AI claims the task and starts working.

**You can also check yourself:**
```bash
np ls --wip  # What's currently being worked on
```

---

## Scenario 4: "This Is Urgent"

Something needs immediate attention.

**You say:**
> "Critical: Production database is down!"

**AI creates:**
```bash
np add -n "urgent: Fix production database connection" -d "Database returning 503 errors"
```

**What happens:**
- Auto-detects `urgent:` → priority=1 (highest)
- Shows first in `np next`

---

## Scenario 5: Breaking Down Big Work

A task is too large. You want to track pieces separately.

**AI creates parent:**
```bash
np add -n "epic: Implement payment system"
→ Created: mp-abc123
```

**AI creates children:**
```bash
np add -n "Database schema for payments" --deps mp-abc123
np add -n "API endpoints for payments" --deps mp-abc123
np add -n "Stripe integration" --deps mp-abc123
np add -n "Webhook handler" --deps mp-abc123
np add -n "Payment UI components" --deps mp-abc123
```

**You check progress:**
```bash
np ls
→ epic: Implement payment system (0.67)
│   ├── Database schema for payments (0.0) ✓
│   ├── API endpoints for payments (0.0) ✓
│   ├── Stripe integration (0.5) ██████░░░░
│   ├── Webhook handler (1.0) pending
│   └── Payment UI components (1.0) pending
```

**What convergence means:**
- `0.67` = 67% of work remaining (parent auto-calculated)
- `0.0` = completed
- `1.0` = not started
- `0.5` = halfway done

---

## Scenario 6: AI Got Stuck

The AI hits a blocker and needs your help.

**You notice:**
```bash
np ls --focus
→ mp-abc123: feat: API integration (blocked) ████████░░
```

**You ask:** "Why is this blocked?"

**AI explains:**
> "The third-party API requires OAuth2 credentials. I can't proceed without API keys."

**You provide the credentials, then:**
```bash
np start mp-abc123  # AI runs this to resume
```

**What you see:**
```bash
np ls --focus
→ mp-abc123: feat: API integration (in_progress)
```

---

## Scenario 7: Tracking Progress on Large Work

A task has multiple steps. The AI updates convergence as it works.

**AI starts:**
```bash
np update mp-abc123 --convergence 0.7  # Just getting started
```

**AI mid-way:**
```bash
np update mp-abc123 --convergence 0.5  # Halfway there
```

**AI almost done:**
```bash
np update mp-abc123 --convergence 0.2  # Almost finished
```

**AI completes:**
```bash
np done mp-abc123  # Sets convergence=0 automatically
```

**You check:**
```bash
np view mp-abc123
→ Status: completed
→ Convergence: 0.0
```

---

## Scenario 8: Finding Something You Forgot

You can't remember the exact task name.

**You do:**
```bash
np find login
→ mp-abc123: feat: User login functionality
→ mp-xyz789: fix: Login redirect loop
```

**Or:**
```bash
np go auth  # Fuzzy search + immediately start working
```

---

## Scenario 9: "What Are We Working On?"

Quick status check during conversation.

**You ask AI:**
> "Where are we at with the project?"

**AI runs:**
```bash
np ls --focus
→ mp-abc123: feat: Payment system (in_progress) 0.67
│   ├── Database schema (0.0) ✓
│   ├── API endpoints (0.0) ✓
│   ├── Stripe integration (0.5) ██████░░░░
│   └── Webhook handler (1.0) pending
→
→ mp-def456: fix: Login mobile (blocked) ████████░░
```

**You see:**
- One task in progress
- One task blocked (needs your help)

---

## Scenario 10: Committing Work

AI references tasks in commits for traceability.

```bash
git commit -m "feat(mp-abc123): implement Stripe payment integration

- Add Stripe SDK initialization
- Create payment intent endpoint
- Handle webhook events
- Add unit tests

🤖 Generated with Claude Code"
```

**Benefit:** You can grep commits by task ID later:
```bash
git log --grep="mp-abc123"
```

---

## Scenario 11: Cleaning Up Completed Tasks

Archive old completed tasks to keep the list focused.

**You review:**
```bash
np ls --type completed
→ mp-old123: Some old task (completed)
→ mp-old456: Another old task (completed)
```

**AI deletes (with --force to not cascade):**
```bash
np del mp-old123 --force
np del mp-old456 --force
```

---

## Scenario 12: Starting a New Phase

Begin tracking a new initiative.

```bash
np add -n "epic: Q2 Features"
→ Created: mp-q2123

np add -n "feat: Dark mode toggle" --deps mp-q2123
np add -n "feat: User profile redesign" --deps mp-q2123
np add -n "feat: Export to PDF" --deps mp-q2123

np update mp-q2123 -p 2  # Set priority
```

**You check:**
```bash
np ls --focus
→ mp-q2123: epic: Q2 Features (pending) 1.0
```

---

## Quick Reference

### Commands You'll Use Most

| What you want | Command |
|---------------|---------|
| See what to work on | `np next` |
| See all tasks | `np ls` |
| See what's in progress | `np ls --wip` |
| See what's actionable | `np ls --focus` |
| Search tasks | `np find <word>` |
| See task details | `np view <id>` |
| Quick find + work | `np go <word>` |

### Auto-Detection Cheat Sheet

| You say | AI creates |
|---------|------------|
| "fix: ..." | type=bug |
| "feat: ..." | type=task |
| "epic: ..." | type=epic |
| "urgent: ..." | priority=1 |
| "important: ..." | priority=2 |
| "optional: ..." | priority=5 |

### Convergence Values

| Value | Meaning |
|-------|---------|
| 1.0 | Not started |
| 0.7 | Just started |
| 0.5 | Halfway |
| 0.3 | Almost done |
| 0.0 | Completed |

---

## Tips for Maximum Effectiveness

1. **Let the AI manage tasks** — You speak naturally, AI handles `np add` commands

2. **Check `np ls --focus`** — Shows what needs attention right now

3. **Ask about blocked tasks** — If you see "blocked", ask "why?"

4. **Watch convergence** — Numbers tell you progress without asking

5. **Use commit IDs** — Task IDs in commits enable traceability

6. **Trust the AI** — It knows to check AGENTS.md for workflow

---

## How It Works with Claude Code

1. You run `np init` → creates `AGENTS.md`
2. Claude Code reads `AGENTS.md` → knows how to use np
3. You speak naturally → AI creates tasks, updates progress
4. You check `np ls` → see what's happening
5. When stuck → you help, AI unblocks and continues

The AI handles all the `np` commands. You focus on the outcome.

---

## Edge Cases & Troubleshooting

### Scenario 13: AI Working on Wrong Task

You notice the AI is working on something unexpected.

**You ask:**
> "What are you working on?"

**AI says:**
> "Implementing the export feature."

**You check:**
```bash
np ls --wip
→ mp-abc123: feat: Export data as CSV (in_progress)
```

**But you wanted:**
```bash
# You wanted it to work on:
→ mp-xyz789: fix: Login bug (pending)
```

**You redirect:**
> "Actually, please work on the login bug instead. Stop the export task."

**AI does:**
```bash
np block mp-abc123  # Block the current task
np work mp-xyz789  # Start the correct task
```

---

### Scenario 14: Fixing a Mistaken Task Name

AI created a task with a typo or wrong description.

**You notice:**
```bash
np ls
→ mp-abc123: feat: Exprot data as CSV (pending)  # Typo!
```

**AI fixes it:**
```bash
np update mp-abc123 -d "Export user data to CSV format

- Support columns: name, email, created_at
- Add filter by date range
- Download as downloadable file"
```

---

### Scenario 15: Wrong Task Type or Priority

AI auto-detected incorrectly, or priorities have changed.

**You see:**
```bash
np ls
→ mp-abc123: feat: Minor UI tweak (priority 2)  # Not actually important
→ mp-xyz789: epic: Core platform rewrite (priority 3)  # Should be priority 1!
```

**AI adjusts:**
```bash
np update mp-abc123 -p 4  # Lower priority
np update mp-xyz789 -p 1  # Raise priority
```

**Or change type:**
```bash
np update mp-abc123 -t bug  # Was task, actually a bug
```

---

### Scenario 16: Duplicate Tasks Created

Same task exists twice.

**You find:**
```bash
np find "export csv"
→ mp-abc123: feat: Export CSV (completed)
→ mp-xyz789: feat: Export to CSV (pending)  # Duplicate!
```

**AI removes duplicate:**
```bash
np del mp-xyz789 --force
```

---

### Scenario 17: Subtask Has Wrong Parent

AI created a subtask under the wrong epic.

**Tree shows:**
```bash
np ls
→ epic: Payment system (0.50)
│   ├── Database schema (0.0) ✓
│   └── feat: Export reports (0.5) ██████░░░░  # Wrong parent!
```

**Fix (delete and recreate):**
```bash
np del mp-reportid --force  # Delete from wrong parent
np add -n "feat: Export reports" --deps mp-paymentid  # Recreate under correct parent
```

---

### Scenario 18: Blocker Resolved But AI Didn't Notice

You fixed something externally, but AI is still blocked.

**You notice:**
```bash
np ls --focus
→ mp-abc123: feat: API integration (blocked)
```

**You say:**
> "I added the API keys to the .env file. You can continue."

**AI resumes:**
```bash
np start mp-abc123
np view mp-abc123  # Verify environment variables
```

---

### Scenario 19: Convergence Looks Wrong

Parent convergence doesn't match reality.

**You see:**
```bash
np ls
→ epic: Payment system (0.3)  # Says 70% done
│   ├── Database schema (0.0) ✓
│   ├── API endpoints (0.0) ✓
│   ├── Stripe integration (0.0) ✓  # All subtasks done!
│   └── Webhook handler (1.0) pending
```

**Actually:** Parent should be `0.75` (3/4 done), not `0.3`.

**AI checks and fixes:**
```bash
# Check individual convergence
np view mp-abc123  # Each subtask

# If children are wrong, fix them:
np update mp-stripe --convergence 1.0  # Actually not done

# Or manually override parent:
np update mp-parent --convergence 0.75
```

---

### Scenario 20: Task Too Vague

Task has no actionable description.

**You see:**
```bash
np view mp-abc123
→ "fix: Something is broken"
```

**AI updates with details:**
```bash
np update mp-abc123 -d "Dashboard fails to load when user has >100 items

- Error in console: 'Maximum call stack size exceeded'
- Only happens on production with real data
- Works fine with < 50 items
- Reproducible in Chrome DevTools"
```

---

### Scenario 21: Priority Creep

Everything seems to be priority 1 or 2.

**You notice:**
```bash
np ls --focus
→ mp-abc123: feat: Nice-to-have feature (priority 1)
→ mp-xyz789: fix: Typo in footer (priority 1)
→ mp-def456: epic: Future idea (priority 1)
```

**You reset priorities:**
```bash
np update mp-abc123 -p 4
np update mp-xyz789 -p 5
np update mp-def456 -p 5
```

**Now:**
```bash
np ls --focus
→ (empty - no actual high priority work)
```

---

### Scenario 22: Too Many Completed Subtasks

An epic has 20+ completed subtasks, cluttering the view.

**AI cleans up:**
```bash
# Review completed subtasks
np ls --type completed | grep "Payment system"

# Delete old ones (with --force to not affect parent)
np del mp-old1 --force
np del mp-old2 --force
# ... repeat for old subtasks
```

**Note:** Completed subtasks contribute to parent convergence. Deleting them may shift the parent's convergence.

---

### Scenario 23: Long-Term Blocked Task

A task has been blocked for days (waiting on external team).

**You notice:**
```bash
np ls --focus
→ mp-abc123: feat: Third-party integration (blocked)  # Blocked for 5 days
```

**Options:**
1. **Keep it visible** as a reminder
2. **Lower priority** while waiting
3. **Note the blocker in description:**
```bash
np update mp-abc123 -d "Blocked by: Waiting on Vendor API access

- Ticket #12345 submitted
- Expected response: next week
- Contact: vendor@example.com"
```

---

### Scenario 24: Task Should Be Cancelled

A task is no longer relevant (not a bug, just unwanted).

**You say:**
> "We don't need the PDF export feature anymore. Cancel it."

**AI does:**
```bash
np update mp-abc123 --status cancelled
```

**Note:** Cancelled tasks are excluded from parent convergence calculations.

---

### Scenario 25: "What Did We Complete Last Week?"

Retrospective or progress review.

**AI runs:**
```bash
# List all completed tasks
np ls --type completed

# If you have timestamps, filter by date
# (SQLite supports date queries)
```

**You see:**
```
→ mp-abc123: feat: User login (completed)
→ mp-xyz789: fix: Password reset (completed)
→ mp-def456: epic: Q1 Planning (completed)
```

---

### Scenario 26: Handoff Between Sessions

You're returning after days away.

**AI does at session start:**
```bash
np ls --wip  # What was in progress?
→ mp-abc123: feat: Payment integration (in_progress)

np view mp-abc123  # What was I doing?
→ "Implementing Stripe webhooks"

np ls --focus  # What's blocked?
→ mp-xyz789: feat: API keys (blocked)
```

**Then:**
```bash
np work mp-abc123  # Resume work
```

---

### Scenario 27: AI Created Task with Wrong Name

AI auto-detected incorrectly.

**You see:**
```bash
np ls
→ mp-abc123: fix: Add dark mode  # Auto-detected as bug, should be task
```

**AI fixes:**
```bash
np update mp-abc123 -t task
```

**Or rename entirely:**
```bash
# np doesn't have rename, so update description:
np update mp-abc123 -d "feat: Add dark mode preference

- Detect system preference
- Add toggle in settings
- Persist to localStorage"
# (name stays but description clarifies)
```

---

### Scenario 28: Context Window Overflow

AI forgot the task details mid-work.

**You say:**
> "What was this task about again?"

**AI checks:**
```bash
np view mp-abc123
→ Shows full description and notes

# AI may also update with new notes:
np update mp-abc123 -d "Original: Export to CSV

Progress notes:
- Completed: Database query for user data
- In progress: CSV formatting logic
- Remaining: File download, error handling"
```

---

### Scenario 29: Finding Tasks for a Code Change

You need to find which task a commit belongs to.

**You have a commit:**
```
feat: Update user profile API
```

**Find the task:**
```bash
np find "profile"
→ mp-abc123: feat: User profile API

# Verify by checking git log
git log --oneline | grep "mp-abc123"
```

---

### Scenario 30: Task Dependency Chain

Task B cannot start until Task A is complete.

**You create:**
```bash
np add -n "epic: API v2"
→ Created: mp-api2

np add -n "Database migration" --deps mp-api2
np add -n "API endpoints" --deps mp-api2
np add -n "Frontend integration" --deps mp-api2
```

**AI works sequentially:**
1. Work on Database migration
2. `np done` when complete
3. Work on API endpoints
4. etc.

**Human checks:**
```bash
np ls
→ epic: API v2 (0.67)
│   ├── Database migration (0.0) ✓
│   ├── API endpoints (0.5) ██████░░░░
│   └── Frontend integration (1.0) pending
```

---

### Scenario 31: Very Small Task Completed Instantly

Task was so small convergence jumped 1.0 → 0.0.

**You notice:**
```bash
np ls --type completed
→ mp-abc123: fix: Typo in error message (completed)
```

**This is fine!** Small tasks complete instantly. The parent epic will still reflect accurate progress.

---

### Scenario 32: Very Large Epic - Convergence Moves Slowly

An epic has many subtasks, so completion seems slow.

**You see:**
```bash
np ls
→ epic: Complete platform rewrite (0.95)  # 1 year of work!
│   ├── 50 subtasks completed
│   └── 3 subtasks remaining
```

**This is correct!** Convergence is accurate. the remaining The parent reflects work.

---

### Scenario 33: Multiple People Coordinating

You and a teammate both work with AI on the same project.

**Best practices:**
- Task IDs in all commits: `feat(mp-abc123): ...`
- Check `np ls --wip` before starting: see what the other person is working on
- Use `np block` when you need someone else's input
- Reference task IDs in Slack/teams: "Can you review mp-abc123?"

---

### Scenario 34: Task Blocked by Another Task

Task B depends on Task A.

**You see:**
```bash
np ls
→ mp-abc123: feat: User dashboard (in_progress) 0.5
│   └── User profile component (1.0) pending

→ mp-xyz789: feat: Admin panel (pending)
    └── Requires: User dashboard (blocked)
```

**AI handles:**
```bash
np block mp-xyz789 -d "Blocked by: mp-abc123 (User dashboard)"
```

---

### Scenario 35: "I'm Done But Convergence Isn't 0"

Task is complete but AI forgot to run `np done`.

**You notice:**
```bash
np ls
→ mp-abc123: feat: Export CSV (in_progress) 0.0
```

**Convergence is 0 but status is still `in_progress`.**

**AI fixes:**
```bash
np done mp-abc123  # Sets both convergence=0 AND status=completed
```

---

## Quick Troubleshooting Reference

| Problem | Solution |
|---------|----------|
| Wrong task name | `np update <id> -d "new description"` |
| Wrong type | `np update <id> -t <type>` |
| Wrong priority | `np update <id> -p <1-5>` |
| Duplicate task | `np del <id> --force` |
| Stuck on wrong task | Redirect with `np work <correct-id>` |
| Blocker resolved | `np start <id>` to resume |
| Convergence looks wrong | Check children with `np view <id>` |
| Task no longer needed | `np update <id> --status cancelled` |
| Too many subtasks | Delete old ones with `np del <id> --force` |
| Forgot what task is about | `np view <id>` |
| Where was I working? | `np ls --wip` |

---

## Scenario 36: "I Don't Know What Tasks to Create"

You have a vague goal but don't know how to break it down. You ask the AI to plan for you.

**You say:**
> "I want to add user authentication to the app. Can you create the tasks?"

**AI breaks it down:**
```bash
np add -n "epic: User Authentication"
→ Created: mp-auth123

np add -n "Database schema for users" --deps mp-auth123
np add -n "Registration API endpoint" --deps mp-auth123
np add -n "Login API endpoint" --deps mp-auth123
np add -n "JWT token generation" --deps mp-auth123
np add -n "Password hashing" --deps mp-auth123
np add -n "Session management" --deps mp-auth123
np add -n "Frontend login form" --deps mp-auth123
np add -n "Protected route middleware" --deps mp-auth123
np add -n "Logout functionality" --deps mp-auth123
```

**You see:**
```bash
np ls
→ epic: User Authentication (1.0)
│   ├── Database schema for users (1.0) pending
│   ├── Registration API endpoint (1.0) pending
│   ├── Login API endpoint (1.0) pending
│   ├── JWT token generation (1.0) pending
│   ├── Password hashing (1.0) pending
│   ├── Session management (1.0) pending
│   ├── Frontend login form (1.0) pending
│   ├── Protected route middleware (1.0) pending
│   └── Logout functionality (1.0) pending
```

**You can adjust:**
- "Add email verification" → AI adds new subtask
- "We don't need session management, just JWT" → AI removes subtask or marks cancelled
- "Prioritize the backend first" → AI reorders or changes priorities

---

## Scenario 37: "Just Create the Tasks You Think We Need"

You trust the AI to figure out what's needed. You delegate completely.

**You say:**
> "We're building a new feature: real-time notifications. Create whatever tasks make sense."

**AI creates a reasonable breakdown:**
```bash
np add -n "epic: Real-time Notifications"
np add -n "Database schema for notifications" --deps
np add -n "WebSocket server setup" --deps
np add -n "Notification API endpoints" --deps
np add -n "Push notification service" --deps
np add -n "Notification UI components" --deps
np add -n "In-app notification center" --deps
np add -n "Notification preferences UI" --deps
np add -n "Email digest integration" --deps
```

**You review:**
```bash
np ls
→ epic: Real-time Notifications (1.0)
│   ├── Database schema for notifications (1.0)
│   ├── WebSocket server setup (1.0)
│   ├── Notification API endpoints (1.0)
│   └── ... (7 more subtasks)
```

**If you disagree:**
> "Actually, skip the email digest for now."

**AI removes it:**
```bash
np update <id> --status cancelled  # Or delete if not needed
```

---

## Scenario 38: AI Proposes Tasks, You Approve

The AI suggests tasks but asks for your approval before creating them.

**You say:**
> "What tasks do we need for the payment feature?"

**AI proposes:**
> Here's my suggested breakdown:
>
> **epic: Payment System**
> 1. Database schema for payments
> 2. Stripe integration
> 3. Payment API endpoints
> 4. Webhook handler
> 5. Refund functionality
> 6. Payment UI components
>
> Should I create these tasks? Anything to add or remove?

**You approve:**
> "Yes, looks good. Add: Error handling for failed payments."

**AI creates:**
```bash
np add -n "epic: Payment System"
np add -n "Database schema for payments" --deps
np add -n "Stripe integration" --deps
# ... etc
np add -n "Error handling for failed payments" --deps
```

---

## Scenario 39: "Break This Task Down Further"

An existing task is too vague. You ask the AI to subdivide it.

**You see:**
```bash
np ls
→ mp-abc123: feat: User dashboard (pending)
```

**You say:**
> "This is too big. Break it down into subtasks."

**AI checks task description, then creates children:**
```bash
np add -n "User profile card" --deps mp-abc123
np add -n "Activity feed component" --deps mp-abc123
np add -n "Stats overview panel" --deps mp-abc123
np add -n "Quick action buttons" --deps mp-abc123
np add -n "Dashboard layout and styling" --deps mp-abc123
```

**Now you see:**
```bash
np ls
→ feat: User dashboard (1.0)
│   ├── User profile card (1.0) pending
│   ├── Activity feed component (1.0) pending
│   ├── Stats overview panel (1.0) pending
│   ├── Quick action buttons (1.0) pending
│   └── Dashboard layout and styling (1.0) pending
```

---

## Scenario 40: Delegating Small Tasks Entirely

You have many small items. You dump them all to the AI and let it create tasks.

**You say:**
> "Create tasks for these: fix the login bug, add dark mode, update the about page, fix the typo in the footer, and improve the error messages."

**AI creates all at once:**
```bash
np add -n "fix: Login button not working on mobile"
np add -n "feat: Add dark mode toggle"
np add -n "feat: Update about page content"
np add -n "fix: Typo in footer copyright"
np add -n "feat: Improve error message UX"
```

**You check:**
```bash
np ls
→ mp-abc123: fix: Login button not working on mobile (pending)
→ mp-def456: feat: Add dark mode toggle (pending)
→ mp-ghi789: feat: Update about page content (pending)
→ mp-jkl012: fix: Typo in footer copyright (pending)
→ mp-mno345: feat: Improve error message UX (pending)
```

---

## When to Delegate Task Creation to AI

| Your Situation | What to Say |
|----------------|-------------|
| Vague goal | "Help me break down [goal] into tasks" |
| Trust AI judgment | "Create the tasks you think we need" |
| Want input first | "What tasks would you suggest for [X]?" |
| Large task needs breakdown | "Break this epic down into subtasks" |
| Multiple small items | List them: "Create tasks for A, B, C, D" |
