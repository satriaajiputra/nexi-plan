# Implementation Plan: `np` CLI Task Tracking Tool

## Overview

Create a CLI-based task tracking tool using Bun, TypeScript, and `bun:sqlite` database. The tool will support hierarchical tasks with automatic convergence calculation via weighted average.

## Requirements Summary

**Commands:**
- `np init` - Initialize project (asks for prefix, creates `.plan/` directory with database and AGENTS.md)

**Add Tasks:**
- `np add -n "Task" -t TYPE -p N [-d "Details"|@file.md|-] [--deps ID]` - Add task, returns hashed ID
  - Shorthand flags: `-n` name, `-t` type, `-p` priority, `-d` description
  - Smart defaults: auto-detect type from name prefix (fix: → bug, feat: → task, epic: → epic)
  - Auto-priority: urgent/critical → 1, important → 2
  - Default values: type=task, priority=3

**Workflow Shortcuts (YOLO-friendly):**
- `np start <id>` - Mark task as in_progress
- `np done <id>` - Mark task as completed + set convergence to 0
- `np block <id>` - Mark task as blocked
- `np work <id>` - View task details + mark as in_progress (one command)
- `np next` - Show next task to work on (highest priority, not blocked)

**List & View:**
- `np ls` - List all tasks in hierarchical tree
- `np ls --wip` - Show only in_progress tasks
- `np ls --focus` - Show high-priority + unblocked tasks
- `np ls --type <TYPE>` - Filter by task type
- `np view <id>` - View full task details including description and sub-tasks

**Search:**
- `np find <query>` - Fuzzy search task names and descriptions
- `np go <query>` - Find task + work on it (combines find + work)

**Update:**
- `np update --status <STATUS> <id>` - Update task status
- `np update --convergence <VALUE> <id>` - Update convergence (0=completed, 1=not started)
- `np update --description "Details"|@file.md|- <id>` - Update task description

**Delete:**
- `np del <id>` - Delete task (cascade deletes children)

**Description Input:**
- Inline: `-d "Short description"`
- From file: `-d @plan.md`
- From stdin: `-d - < plan.md` (or pipe: `cat plan.md | np add ... -d -`)

**Enums:**
- Priority: 1-5 (1=highest, 5=lowest)
- Status: `pending`, `in_progress`, `completed`, `blocked`, `cancelled`
- Type: `epic`, `task`, `bug`

**Convergence Logic:** Weighted average based on task type (epic=1.0, task=2.0, bug=3.0)

**Task IDs:**
- Hashed IDs with configurable prefix (set during `np init`)
- Example: `np-abc123`, `myproject-def456` (prefix + short hash)
- Hash generated from timestamp + random bytes
- Prefix stored in `.plan/config.json`

---

## File Structure

```
.nexiplan/
├── src/
│   ├── index.ts                 # CLI entry point - argument parsing & routing
│   ├── commands/
│   │   ├── init.ts              # Initialize project command
│   │   ├── add.ts               # Add task command (with smart defaults)
│   │   ├── list.ts              # List tasks command (with filters)
│   │   ├── view.ts              # View task details command
│   │   ├── update.ts            # Update task command
│   │   ├── delete.ts            # Delete task command
│   │   ├── start.ts             # Workflow: mark in_progress
│   │   ├── done.ts              # Workflow: mark completed
│   │   ├── block.ts             # Workflow: mark blocked
│   │   ├── work.ts              # Workflow: view + start
│   │   ├── next.ts              # Workflow: suggest next task
│   │   ├── find.ts              # Fuzzy search command
│   │   └── go.ts                # Find + work command
│   ├── db/
│   │   ├── schema.sql           # Database schema definition
│   │   ├── client.ts            # Database connection & initialization
│   │   └── queries.ts           # Prepared SQL statements
│   ├── models/
│   │   └── task.ts              # TypeScript interfaces & enums
│   ├── services/
│   │   ├── id.ts                # Hashed ID generation service
│   │   ├── convergence.ts       # Convergence calculation service
│   │   └── fuzzy.ts             # Fuzzy search service
│   └── utils/
│       ├── cli.ts               # CLI argument parsing
│       ├── format.ts            # Output formatting
│       ├── fs.ts                # File/directory operations
│       └── detect.ts            # Smart type/priority detection
├── templates/
│   └── AGENTS.md                # Template for AGENTS.md file
├── tests/                       # Integration & unit tests
├── bin/np                       # Compiled binary
├── package.json
└── tsconfig.json

# Runtime created files (in user's project):
.plan/
├── config.json                  # Stores prefix configuration
└── tasks.db                     # SQLite database
```

---

## Database Schema

**File:** `src/db/schema.sql`

```sql
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hash_id TEXT NOT NULL UNIQUE,      -- Hashed ID (e.g., "np-abc123")
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('epic', 'task', 'bug')),
    priority INTEGER NOT NULL CHECK(priority BETWEEN 1 AND 5),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'blocked', 'cancelled')),
    convergence REAL NOT NULL DEFAULT 1.0 CHECK(convergence BETWEEN 0 AND 1),
    description TEXT,
    parent_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_tasks_hash_id ON tasks(hash_id);
CREATE INDEX idx_tasks_parent_id ON tasks(parent_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_type ON tasks(type);

CREATE TRIGGER update_tasks_timestamp
AFTER UPDATE ON tasks
BEGIN
    UPDATE tasks SET updated_at = datetime('now') WHERE id = NEW.id;
END;
```

**Config:** `.plan/config.json`
```json
{
  "prefix": "np",
  "version": "1.0.0"
}
```

---

## Convergence Calculation

**File:** `src/services/convergence.ts`

Weights by task type:
- epic: 1.0 (highest impact on parent)
- task: 2.0
- bug: 3.0 (lowest impact on parent)

**Formula:**
```
Parent Convergence = Σ(Child Convergence × Child Weight) / Σ(Child Weights)
```

- Excludes cancelled tasks from calculation
- Propagates bottom-up (child update → parent → grandparent...)
- If no children, convergence = 0 (completed)

---

## Implementation Steps

### 1. ID Generation Service
- [ ] Create `src/services/id.ts` with hash generation
- [ ] Generate short hash from timestamp + random bytes
- [ ] Support configurable prefix

### 2. Database Layer
- [ ] Create `src/db/schema.sql` with tasks table (including hash_id), indexes, triggers
- [ ] Implement `src/db/client.ts` using `bun:sqlite` for connection
- [ ] Create `src/db/queries.ts` with prepared statements (CRUD operations)
- [ ] Auto-create `.plan/` directory and database on init

### 3. Models & Types
- [ ] Create `src/models/task.ts` with TypeScript interfaces
- [ ] Define enums: TaskType, TaskStatus, TaskPriority
- [ ] Export types for application-wide use

### 4. Convergence Service
- [ ] Implement `src/services/convergence.ts`
- [ ] Weighted average calculation function
- [ ] Bottom-up propagation function (update parent chain)
- [ ] Handle edge cases (no children, cancelled tasks)

### 5. Fuzzy Search Service
- [ ] Implement `src/services/fuzzy.ts` with fuzzy matching
- [ ] Search through task names and descriptions
- [ ] Return ranked results by relevance

### 6. CLI Utilities
- [ ] Create `src/utils/cli.ts` with argument parser (support short flags: -n, -t, -p, -d)
- [ ] Implement `src/utils/format.ts` for output formatting
- [ ] Implement `src/utils/fs.ts` for file/directory operations
- [ ] Implement `src/utils/detect.ts` for smart type/priority detection
- [ ] Add validation functions for inputs

### 7. Templates
- [ ] Create `templates/AGENTS.md` with workflow documentation

### 8. Command Handlers
- [ ] `src/commands/init.ts` - Initialize project, ask for prefix, create .plan/
- [ ] `src/commands/add.ts` - Insert task with smart defaults, return hashed ID
- [ ] `src/commands/list.ts` - Fetch tasks with filters (--wip, --focus, --type), build tree
- [ ] `src/commands/view.ts` - Show full task details with description
- [ ] `src/commands/update.ts` - Update status/convergence/description, trigger propagation
- [ ] `src/commands/delete.ts` - Cascade delete, warn if has children
- [ ] `src/commands/start.ts` - Mark task as in_progress
- [ ] `src/commands/done.ts` - Mark as completed + convergence 0
- [ ] `src/commands/block.ts` - Mark as blocked
- [ ] `src/commands/work.ts` - View task + mark in_progress
- [ ] `src/commands/next.ts` - Suggest next task (priority-based, unblocked)
- [ ] `src/commands/find.ts` - Fuzzy search tasks
- [ ] `src/commands/go.ts` - Find + work on task

### 9. Entry Point
- [ ] Update `src/index.ts` with command routing
- [ ] Integrate all command handlers
- [ ] Add error handling and help text

### 10. Testing
- [ ] Unit tests for ID generation, convergence, fuzzy search
- [ ] Unit tests for smart detection (type/priority from name)
- [ ] Integration tests for commands
- [ ] Manual testing of full workflows

---

## Critical Files

| File | Purpose |
|------|---------|
| `src/db/schema.sql` | Database schema with hash_id |
| `src/index.ts` | CLI entry point & routing |
| `src/services/id.ts` | Hashed ID generation |
| `src/services/convergence.ts` | Weighted average convergence algorithm |
| `src/services/fuzzy.ts` | Fuzzy search for tasks |
| `src/utils/detect.ts` | Smart type/priority detection |
| `src/db/queries.ts` | Database operations layer |
| `src/models/task.ts` | TypeScript interfaces & enums |
| `templates/AGENTS.md` | AGENTS.md template for project init |

---

## Example Usage Flow

```bash
# Initialize project in current directory
$ np init
Enter task ID prefix (default: np): myproj
Created .plan/ directory with configuration.

# === YOLO MODE: Fast task creation ===

# Quick add with smart defaults (auto-detects "fix:" → bug)
$ np add -n "fix: login CSS" -p 1
Task created with ID: myproj-abc123

# Quick add with auto-priority ("urgent" → priority 1)
$ np add -n "urgent: Implement auth" -t task
Task created with ID: myproj-def456

# Add epic with full flags
$ np add -n "Build MVP" -t epic -p 1 -d "Main epic for MVP"
Task created with ID: myproj-ghi789

# Add task with parent dependency
$ np add -n "Add login form" -t task -p 2 --deps myproj-ghi789
Task created with ID: myproj-jkl012

# === YOLO MODE: Fast workflows ===

# What should I work on?
$ np next
→ myproj-abc123: fix: login CSS (Priority: 1, Status: pending)

# Start working on a task (view + mark in_progress)
$ np work myproj-abc123
=== myproj-abc123: fix: login CSS ===
Type: BUG, Priority: 1, Status: in_progress

# Done with this task
$ np done myproj-abc123
Task myproj-abc123 marked as completed ✓

# Task blocked?
$ np block myproj-def456
Task myproj-def456 marked as blocked

# === LISTING & FILTERING ===

# Show all tasks
$ np ls
myproj-ghi789: [EPIC] Build MVP (P1) [pending] [0.95]
└── myproj-jkl012: [TASK] Add login form (P2) [in_progress] [0.5]

# Show only what's in progress
$ np ls --wip
myproj-jkl012: [TASK] Add login form (P2) [in_progress] [0.5]

# Show focus tasks (high priority, not blocked)
$ np ls --focus
myproj-abc123: [BUG] fix: login CSS (P1) [pending]

# Show only bugs
$ np ls --type bug
myproj-abc123: [BUG] fix: login CSS (P1) [completed] [0.0]

# === SEARCH ===

# Find tasks by keyword
$ np find login
Found 2 tasks:
  myproj-abc123: fix: login CSS
  myproj-jkl012: Add login form

# Find and immediately start working
$ np go login
Found 2 tasks, working on: myproj-jkl012
=== myproj-jkl012: Add login form ===
Status: in_progress

# === CLAUDE CODE INTEGRATION ===

# Add task from Claude Code plan file
$ np add -n "Implement API endpoints" -t task -p 2 -d @claude-plan.md
Task created with ID: myproj-mno345

# View full plan for implementation
$ np view myproj-mno345
=== myproj-mno345: Implement API endpoints ===
Type: TASK, Priority: 2, Status: pending
Parent: myproj-ghi789

Description:
[Full Claude Code plan content displayed here]

---

# === FULL COMMANDS (when needed) ===

# Full update with convergence
$ np update --convergence 0.5 myproj-jkl012
Task myproj-jkl012 updated: convergence → 0.5

# Update description from file
$ np update --description @new-plan.md myproj-mno345
Task myproj-mno345 updated: description

# Delete task (cascades to children)
$ np del myproj-ghi789
This will delete task myproj-ghi789 and its 2 child tasks. Continue? (y/N): y
Deleted task myproj-ghi789 and 2 child tasks.
```

---

## AGENTS.md Template

Created during `np init` to guide AI agents on how to use the task tracker:

```markdown
# Task Tracking with `np`

This project uses `np` CLI for task tracking. When working on this project:

## Quick Reference (YOLO Mode)

**Workflow Shortcuts:**
- `np next` - Show what to work on next
- `np work <id>` - View task + mark as in_progress
- `np done <id>` - Mark as completed
- `np start <id>` - Mark as in_progress
- `np block <id>` - Mark as blocked

**Search & Navigate:**
- `np find <query>` - Search tasks
- `np go <query>` - Find + work on task
- `np view <id>` - View full task details (including plan/description)

**List Tasks:**
- `np ls` - List all tasks
- `np ls --wip` - Show only in_progress tasks
- `np ls --focus` - Show high-priority + unblocked tasks
- `np ls --type <TYPE>` - Filter by type

**Add Tasks:**
- `np add -n "Task name" -t TYPE -p N` - Add task
- Smart detection: "fix:" → bug, "feat:" → task, "epic:" → epic
- Auto-priority: "urgent" → 1, "important" → 2

**Full Commands:**
- `np update --status <STATUS> <id>` - Update status
- `np update --convergence <VALUE> <id>` - Update convergence
- `np del <id>` - Delete task

## Convergence Values

- 0.0 = Completed
- 0.3 = Mostly done
- 0.5 = In progress
- 0.7 = Started
- 1.0 = Not started

## Example AI Workflow

1. Ask user: "What should I work on?"
2. User says: "Implement task myproj-abc123"
3. Run: `np work myproj-abc123` → Shows details, marks as in_progress
4. Work on implementation
5. When done: `np done myproj-abc123` → Marks completed, sets convergence to 0
```
