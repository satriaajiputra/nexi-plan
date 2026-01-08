# nexi-plan

A CLI task tracker for your projects. Track work items, bugs, and epics with hierarchical relationships and convergence tracking.

## What is this?

`np` is a command-line tool you run in your project directory to track tasks. Each task gets a short ID (e.g., `np-abc123`) that you can reference in commits, PRs, or Claude Code conversations.

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
np work np-abc123  # Shows task details, marks as in_progress

# Mark done
np done np-abc123

# List all
np ls
np ls --wip        # Work in progress only
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
| `np ls --wip` | Show only in-progress tasks |
| `np view <id>` | Show full task details |
| `np update <id> --status pending\|in_progress\|completed\|blocked\|cancelled` | Update status |
| `np update <id> --convergence 0.5` | Update progress (0=done, 1=not started) |
| `np del <id>` | Delete task (cascades to children) |
| `np start <id>` | Mark as in_progress |
| `np done <id>` | Mark as completed |
| `np block <id>` | Mark as blocked |
| `np work <id>` | View details + mark in_progress |
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

**Status:** `pending`, `in_progress`, `completed`, `blocked`, `cancelled`

## Convergence

Parent task convergence is a weighted average of children's convergence:

```
Parent Convergence = Σ(Child Convergence × Child Weight) / Σ(Child Weights)
```

- 0.0 = Completed
- 0.5 = Halfway done
- 1.0 = Not started

Excludes cancelled tasks from calculation.

## ⚠️ AI Safety Warning

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

---

## Claude Code Integration

Run `np init` in your project and an `AGENTS.md` file will be created with instructions for AI assistants on how to use the task tracker.

## Common Workflows Guide

For detailed real-world examples of how to use `np` with AI coding agents, see [COMMON_WORKFLOWS.md](./COMMON_WORKFLOWS.md). It includes:

- **40+ scenarios** covering typical workflows
- **Edge cases** and troubleshooting
- **Task delegation** to AI
- **Tips** for maximum effectiveness

---

Built with [Bun](https://bun.com)
