# Test Plan: nexi-plan CLI Commands

## Overview
Write comprehensive `bun test` tests for all CLI commands in the nexi-plan task tracker. The project currently has **no tests**.

## Test Structure
All tests will be in `tests/` directory with the following structure:
```
tests/
├── db/
│   ├── client.test.ts
│   ├── schema.test.ts
│   └── queries.test.ts
├── commands/
│   ├── init.test.ts
│   ├── add.test.ts
│   ├── list.test.ts
│   ├── view.test.ts
│   ├── update.test.ts
│   ├── delete.test.ts
│   ├── status.test.ts (start, done, block)
│   ├── work.test.ts
│   ├── next.test.ts
│   ├── find.test.ts
│   └── go.test.ts
├── services/
│   ├── convergence.test.ts
│   ├── fuzzy.test.ts
│   └── id.test.ts
└── utils/
    ├── detect.test.ts
    ├── cli.test.ts
    ├── format.test.ts
    ├── fs.test.ts
    └── convergence.test.ts
```

## Test Fixtures & Helpers

Create `tests/fixtures.ts` with:
- `createTestDb()`: Creates an in-memory SQLite database with schema
- `cleanupTestDb(db)`: Cleans up test database
- `createTestTask(db, overrides)`: Factory function for creating test tasks
- `getTestPrefix()`: Returns test prefix for task IDs
- `mockConsole()`: Captures console output for assertions

## Command Tests

### 1. `init.test.ts`
- Creates .plan/ directory
- Initializes SQLite database with correct schema
- Saves config.json with prefix
- Handles existing .plan directory gracefully
- Creates AGENTS.md template file

### 2. `add.test.ts`
- Creates basic task with default values
- Smart detection:
  - `fix:` prefix → bug type
  - `feat:` prefix → task type
  - `epic:` prefix → epic type
  - `urgent:` prefix → priority 1
  - `important:` prefix → priority 2
- Accepts explicit `--type` and `--priority` flags
- Sets parent task via `--deps`
- Handles description from:
  - Inline text
  - `@filename` file reference
  - Error on missing file
- Returns task with generated hash_id
- Propagates convergence to parent

### 3. `list.test.ts`
- Shows all tasks in tree view
- `--wip` filter: shows only in_progress tasks
- `--focus` filter: high priority (1-2) unblocked tasks
- `--type <type>` filter: filters by task type
- Empty list shows "No tasks found" message
- Tree structure correctly shows parent-child relationships

### 4. `view.test.ts`
- Shows full task details
- Displays sub-tasks if task has children
- Shows task not found for invalid ID
- Correctly parses task ID with suffix (e.g., `id.1`)

### 5. `update.test.ts`
- Updates status to valid values (pending, in_progress, completed, blocked, cancelled)
- Rejects invalid status values
- Updates convergence value (0-1 range)
- Updates description (inline and @file)
- Propagates convergence changes to parent tasks
- Snap-to-zero behavior for near-zero convergence

### 6. `delete.test.ts`
- Deletes single task
- Shows warning with child count when task has children
- `--force` flag bypasses confirmation warning
- Cascades delete to all children
- Handles task not found gracefully

### 7. `status.test.ts` (start, done, block)
- `start`: Sets status to in_progress
- `done`: Sets status to completed
- `block`: Sets status to blocked
- All handle invalid task ID gracefully
- All propagate convergence changes

### 8. `work.test.ts`
- Shows task details
- Marks task as in_progress
- Handles task not found

### 9. `next.test.ts`
- Shows highest priority pending/in_progress task
- Falls back to highest priority pending when no priority 1-2 tasks
- Shows appropriate message when all tasks are completed/blocked

### 10. `find.test.ts`
- Exact match scoring (score = 1.0)
- Prefix match scoring (score = 0.9)
- Contains match scoring (score = 0.8)
- Levenshtein distance for fuzzy matching
- Shows "No tasks found" for no matches
- Results sorted by score descending

### 11. `go.test.ts`
- Finds task by exact ID match
- Falls back to fuzzy search
- Calls work() on found task
- Shows message when no match found

## Service Tests

### `services/convergence.test.ts`
- `calculateParentConvergence()`: Weighted average of children
- `propagateConvergence()`: Updates parents recursively
- `autoCompleteIfConverged()`: Auto-marks complete at threshold
- Excludes cancelled tasks from calculation
- Correct weights: epic=1.0, task=2.0, bug=3.0

### `services/fuzzy.test.ts`
- `levenshteinDistance()`: Correct distance calculation
- `calculateScore()`: Scoring algorithm
- `fuzzySearchTasks()`: Returns sorted results
- `findBestMatch()`: Returns single best match
- `matchesTaskId()`: Task ID matching

### `services/id.test.ts`
- `generateTaskId()`: Generates prefix-XXXXXX format
- `getPlanConfig()`: Reads config
- `savePlanConfig()`: Writes config

## Utility Tests

### `utils/detect.test.ts`
- `detectTaskType()`: Correctly identifies prefixes
- `detectPriority()`: Correctly identifies priority prefixes
- `cleanTaskName()`: Strips all prefixes
- `validateTaskType()`: Accepts valid, rejects invalid
- `validatePriority()`: Validates 1-5 range
- `validateStatus()`: Validates all statuses
- `validateConvergence()`: Validates 0-1 range

### `utils/cli.test.ts`
- `parseArgs()`: Correct command extraction
- Long flags: `--name=value` and `--name value`
- Short flags: `-n value` and `-n`
- Positional arguments extraction
- `normalizeFlags()`: Expands short to long flags
- `getFlag()`: Flag value extraction with defaults
- `hasFlag()`: Boolean flag detection
- `getArg()`: Positional argument extraction

### `utils/format.test.ts`
- `formatTaskType()`: Correct type formatting
- `formatTaskStatus()`: Correct status formatting
- `formatConvergence()`: Percentage calculation
- `parseTaskId()`: ID suffix handling
- `formatTask()`: Task line formatting
- `formatTaskNode()`: Tree view formatting
- `formatTaskDetails()`: Full details formatting
- `buildTaskTree()`: Tree construction from flat list

### `utils/fs.test.ts`
- `readDescription()`: Inline, file, stdin handling
- `isFromFile()` / `isFromStdin()`: Input type detection
- `extractFilePath()`: File path extraction

### `utils/convergence.test.ts`
- `snapToZero()`: Snaps values <= 0.01 to 0
- `isConverged()`: Returns true if <= 0.01
- Clamps negative values to 0

## Database Tests

### `db/schema.test.ts`
- Verifies SCHEMA_SQL creates correct table structure
- Tests all CHECK constraints
- Tests foreign key constraints
- Tests triggers for updated_at

### `db/queries.test.ts`
- `insertTask()`: Task creation
- `getTaskById()`: Single task retrieval
- `getAllTasks()`: All tasks retrieval
- `getTasksByFilter()`: Filtered queries
- `updateTask()`: Task updates
- `deleteTask()`: Task deletion
- `countChildren()`: Child counting
- `searchTasks()`: LIKE-based search

### `db/client.test.ts`
- `findProjectRoot()`: Directory traversal
- `initDatabase()`: Database initialization
- `getDatabase()`: Connection retrieval
- `planExists()`: Existence check

## Test Execution
- Run all tests: `bun test`
- Run specific test: `bun test tests/commands/add.test.ts`
- Coverage reporting: Built-in with bun test

## Files to Create/Modify
1. `tests/fixtures.ts` - Test utilities and helpers
2. `tests/db/client.test.ts`
3. `tests/db/schema.test.ts`
4. `tests/db/queries.test.ts`
5. `tests/commands/init.test.ts`
6. `tests/commands/add.test.ts`
7. `tests/commands/list.test.ts`
8. `tests/commands/view.test.ts`
9. `tests/commands/update.test.ts`
10. `tests/commands/delete.test.ts`
11. `tests/commands/status.test.ts`
12. `tests/commands/work.test.ts`
13. `tests/commands/next.test.ts`
14. `tests/commands/find.test.ts`
15. `tests/commands/go.test.ts`
16. `tests/services/convergence.test.ts`
17. `tests/services/fuzzy.test.ts`
18. `tests/services/id.test.ts`
19. `tests/utils/detect.test.ts`
20. `tests/utils/cli.test.ts`
21. `tests/utils/format.test.ts`
22. `tests/utils/fs.test.ts`
23. `tests/utils/convergence.test.ts`
