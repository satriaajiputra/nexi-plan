# nexi-plan

A CLI task tracker for your projects. Track work items, bugs, and epics with hierarchical relationships and convergence tracking.

## Table of Contents

- [What is this?](#what-is-this)
- [Install](#install)
- [Initialize in your project](#initialize-in-your-project)
- [Quick Start](#quick-start)
- [Commands](#commands)
- [Smart Prefixes](#smart-prefixes)
- [Task Properties](#task-properties)
- [Convergence](#convergence)
- [Database Migrations](#database-migrations)
- [Claude Code Integration](#claude-code-integration)
- [Common Workflows Guide](#common-workflows-guide)
- [Inspiration](#inspiration)

## What is this?

`np` is a command-line tool you run in your project directory to track tasks. Each task gets a short ID (e.g., `np-abc123`) that you can reference in commits, PRs, or Claude Code conversations.

> [!WARNING]
> **AI Safety Warning**
>
> **AI coding agents can make mistakes.** Always double-check the code they generate.
>
> - AI can produce bugs, security vulnerabilities, or incorrect logic
> - AI may claim something is working when it's not (false-positive claims)
> - AI can be dishonest about its limitations or confidence level
> - **You are responsible** for the code in your codebase
> - **Control the AI, don't let it control you**
> - Review, test, and understand every change before merging
>
> Use `np` to track work and maintain visibility—but never skip human review.


## Install

### Option 1: Download Pre-built Binary (Recommended)

Grab the latest release for your platform from the [releases page](https://github.com/satriaajiputra/nexi-plan/releases).

```bash
# Linux (AMD64)
curl -L https://github.com/satriaajiputra/nexi-plan/releases/latest/download/np-linux-amd64 -o np
chmod +x np
sudo mv np /usr/local/bin/  # or ~/bin/ if it's in your PATH

# macOS (Apple Silicon)
curl -L https://github.com/satriaajiputra/nexi-plan/releases/latest/download/np-macos-arm64 -o np
chmod +x np
sudo mv np /usr/local/bin/

# macOS (Intel)
curl -L https://github.com/satriaajiputra/nexi-plan/releases/latest/download/np-macos-amd64 -o np
chmod +x np
sudo mv np /usr/local/bin/

# Windows (PowerShell)
# Download np-windows-amd64.exe from releases, then:
# Add to PATH or move to a directory in PATH
```

### Option 2: Build from Source

```bash
# Clone and build
git clone https://github.com/satriaajiputra/nexi-plan.git
cd nexi-plan
bun install
bun run build

# Add to PATH (or symlink)
ln -s $(pwd)/bin/np ~/bin/np  # or anywhere in your PATH
```

## Initialize in your project

```bash
cd /path/to/your/project
np init myproject
# Creates .plan/ directory with SQLite database
```

## Quick Start

```bash
# Add a task
np add -n "Implement login API"
np add -n "fix: CSS alignment bug"  # Auto-detects type=bug
np add -n "urgent: database outage" # Auto-detects priority=1

# See what to work on
np next

# Start working
np work np-abc123  # Shows task details

# Update progress
np update np-abc123 --convergence 0.5  # Halfway done
np update np-abc123 --convergence 0.01    # Completed and tested

# List all
np ls
np ls --wip        # Work in progress only (convergence < 1.0 && > 0.01)
np ls --focus      # High priority, unblocked

# Search
np find login
np go api          # Find + immediately work on it
```

## Commands

| Command | Description |
|---------|-------------|
| `np init [prefix]` | Create `.plan/` database in current directory |
| `np add -n "name"` | Add task with smart defaults |
| `np ls` | List all tasks in tree view |
| `np ls --wip` | Show work-in-progress tasks (convergence < 1.0 && > 0.01) |
| `np view <id>` | Show full task details |
| `np update <id> --status blocked\|cancelled` | Update status (only blocked/cancelled) |
| `np update <id> --convergence 0.5` | Update progress (0.01=done, 1=not started) |
| `np del <id>` | Delete task (cascades to children) |
| `np block <id>` | Mark as blocked |
| `np work <id>` | View task details |
| `np next` | Suggest next task to work on |
| `np find <query>` | Fuzzy search tasks |
| `np go <query>` | Find + work on task |

## Smart Prefixes

Task name prefixes auto-detect properties:

| Prefix | Effect |
|--------|--------|
| `fix:` | type = bug |
| `feat:` | type = task |
| `epic:` | type = epic |
| `urgent:` / `critical:` | priority = 1 |
| `important:` | priority = 2 |

## Task Properties

**Types:**
- `epic` - Large feature/initiative (weight: 1.0)
- `task` - Regular work item (weight: 2.0)
- `bug` - Bug fix (weight: 3.0)

**Priority:** 1 (highest) to 5 (lowest), default: 3

**Status:**
- `blocked` - Task cannot proceed (e.g., waiting on dependencies)
- `cancelled` - Task is no longer relevant
- Other states are derived from convergence value:
  - `pending` - convergence === 1.0 (not started)
  - `not converged` - 0.01 < convergence < 1.0 (in progress)
  - `converged` - convergence <= 0.01 (completed)

## Convergence

Convergence measures how much work remains on a task, from 1.0 (not started) to 0.01 (completed and tested).

### Values

| Value | Meaning |
|-------|--------|
| 1.0 | Not started |
| 0.7 | Just started |
| 0.5 | Halfway done |
| 0.3 | Almost done |
| 0.01 | Converged (completed and tested) |

**Important:** Only set convergence to 0.01 when the task is actually complete, tested, and verified. Never set it to 0.0 or below 0.01.

### How to Complete a Task

Set convergence to 0.01 when done (and tested!):

```bash
np update <id> --convergence 0.01
```

Tasks with convergence <= 0.01 are considered converged.

### Parent Task Calculation

Parent tasks automatically calculate convergence as a weighted average of their children:

```
Parent Convergence = Σ(Child Convergence × Child Weight) / Σ(Child Weights)
```

**Weights:**
- Epic (weight 1.0) - heavily influenced by children
- Task (weight 2.0) - balanced influence
- Bug (weight 3.0) - less impact on parent

**Example:**
```
epic: Payment System (0.4)
├── Database schema (0.0) ✓
├── API endpoints (0.0) ✓
└── Stripe integration (0.8)
```

Parent convergence = (0×1 + 0×1 + 0.8×2) / (1+1+2) = 1.6/4 = 0.4

**Note:** Cancelled tasks are excluded from parent calculation.

### Why Convergence-Based Status?

Unlike traditional task trackers that use separate status fields (`pending`, `in progress`, `done`), `np` derives status directly from convergence. This design choice solves several real-world problems:

**Prevents AI false-positive claims**
- Traditional "done" status is binary and ambiguous—AI agents often mark tasks as complete when they're 80% done
- With `np`, only convergence ≤ 0.01 means complete—clear threshold that prevents premature completion claims
- AI agents must understand the work-remaining mental model, reducing false-positive "it's basically done" errors

**Automatic status propagation**
- When you update a child task's convergence, parent tasks automatically recalculate
- No manual status updates needed—convergence drives everything
- Hierarchical progress is always accurate and up-to-date

**Continuous progress tracking**
- Instead of discrete status jumps (pending → in progress → done), convergence captures granular progress
- Better reflects real-world development where tasks are rarely truly "done" or "not done"
- Weighted parent calculation accounts for different task types (epics vs tasks vs bugs)

**Clear communication**
- When discussing tasks with AI agents or teammates, convergence provides an objective measure
- "This task is at 0.3 convergence" means "30% work remaining" - unambiguous and actionable
- Reduces misalignment about what "almost done" means

---

## Database Migrations

When you upgrade to a new version of `np`, your database will be automatically migrated when you run any `np` command.

### How It Works

- Database version is tracked using SQLite's `PRAGMA user_version`
- Migrations run automatically when you open your database with a new version
- Your data is preserved during migrations

### Manual Migration

If you want to explicitly run migrations:

```bash
# Run any np command - migrations happen automatically
np ls
```

### Backup Before Major Updates

For peace of mind, backup your database before updating:

```bash
cp .plan/tasks.db .plan/tasks.db.backup
```

---

## Claude Code Integration

Run `np init` in your project and the following files will be created:

- `AGENTS.md` - Instructions for AI assistants on how to use the task tracker
- `.claude/agents/convergence-verifier.md` - A Claude Code agent for verifying task convergence
- `.claude/commands/verify-convergence.md` - A slash command for verifying convergence

### Claude Code Slash Command

When using Claude Code, you can verify task convergence by running:

```
/verify-convergence "<task_id>"
```

This command analyzes the task and its children to provide an accurate convergence value. For example:

```
/verify-convergence "mp-abc123"
```

The agent will:
- Fetch the task details
- Check all child tasks and their convergence values
- Calculate the weighted average (if applicable)
- Report whether the current convergence is accurate
- Suggest corrections if needed

**Example output:**
```
Task: mp-abc123: feat: Implement payment system
Current convergence: 0.50

Child tasks:
- mp-def456: Database schema (0.01 - converged)
- mp-ghi789: API endpoints (0.01 - converged)
- mp-jkl012: Stripe integration (0.50 - not converged)

Calculated parent convergence: (0.01×2 + 0.50×2) / (2+2) = 1.02/4 = 0.255

⚠️  Current convergence (0.50) differs from calculated (0.255)
Suggestion: Update convergence to 0.255
```

## Common Workflows Guide

For detailed real-world examples of how to use `np` with AI coding agents, see [COMMON_WORKFLOWS.md](./COMMON_WORKFLOWS.md). It includes:

- **40+ scenarios** covering typical workflows
- **Edge cases** and troubleshooting
- **Task delegation** to AI
- **Tips** for maximum effectiveness

## Inspiration

nexi-plan was inspired by my work with my Big Bro, while he was building a self-healing system. Watching how he approached system resilience and automation sparked the idea for a task tracker that could:

- **Automate tedious work** - Just as his system automatically detected and recovered from failures, I wanted `np` to automatically handle convergence calculations and task completions
- **Reduce cognitive load** - By automatically tracking parent task progress from children, developers can focus on the work itself rather than manual status updates

The convergence concept came from thinking about how complex systems naturally move toward equilibrium, and how breaking down large tasks into smaller pieces (children) naturally shows progress on the larger goal (parent).

---

Built with ☕ by [Satria Aji Putra](https://github.com/satriaajiputra)
