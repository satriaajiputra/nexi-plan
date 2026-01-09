# Remove Status (Completed) - Use Convergence Only

## Goal
Remove explicit "completed" and "in_progress" status, using convergence (≤0.01 = converged) as the sole indicator of task completion. This eliminates ambiguity between "complete" and "convergence".

## Status Values After Change
- `PENDING` - convergence = 1.0 (task not started) - derived
- `BLOCKED` - task is blocked
- `CANCELLED` - task is cancelled (excluded from convergence calculation)
- No `COMPLETED` or `IN_PROGRESS` - convergence value shows progress instead

## Files to Modify

### 1. `src/models/task.ts`
- Remove `COMPLETED` and `IN_PROGRESS` from `TaskStatus` enum
- Update `TaskUpdate` interface (status still needed for BLOCKED/CANCELLED)

### 2. `src/utils/format.ts`
- Update `formatTaskStatus()` - derive status from convergence and actual status:
  - If actual status is 'blocked' → "blocked"
  - If actual status is 'cancelled' → "cancelled"
  - If convergence <= 0.01 → "converged"
  - If convergence === 1.0 → "pending"
  - Otherwise → "not converged"
- Update `formatConvergence()` - show raw value (e.g., "0.25") instead of percentage
- Update `formatTask()` - use derived status instead of `[STATUS]` display
- Update `formatTaskDetails()` - same changes

### 3. `src/services/convergence.ts`
- Remove `autoCompleteIfConverged()` function entirely
- Update `calculateParentConvergence()` - remove `COMPLETED` status check (already only checks CANCELLED)
- Update `propagateConvergence()` - remove `autoCompleteIfConverged()` calls

### 4. `src/commands/start.ts` - DELETE FILE
- `np start` command no longer needed (convergence shows progress)

### 5. `src/commands/done.ts` - DELETE FILE
- User confirmed removal

### 6. `src/commands/list.ts`
- `--wip` filter: change from `status === "in_progress"` to `convergence < 1.0 && convergence > 0.01`
- `--focus` filter: remove `status !== "cancelled"` check (unchanged)

### 7. `src/commands/next.ts`
- Remove `excludeStatus` with COMPLETED (no longer needed)
- Update candidates filter: `convergence > 0.01 && priority <= 2`
- Sort by convergence (lowest first = most done)

### 8. `src/commands/view.ts`
- Update child task display to show convergence status

### 9. `src/commands/work.ts`
- Remove `status: IN_PROGRESS` update (no longer needed)
- Keep showing task details and propagating convergence
- Message: "Task marked as in progress" → "Task ready to work on"

### 10. `src/commands/update.ts`
- Remove status update validation for COMPLETED/IN_PROGRESS

### 11. `src/commands/block.ts` - KEEP
- BLOCKED status still valid

### 12. `src/db/schema.ts`
- Update CHECK constraint to only allow: null, 'blocked', 'cancelled' (Null means in_progress, converged, not_converged based on convergence derivation)

### 13. `src/db/queries.ts`
- Update default status in insert to 'pending'

### 14. `src/index.ts`
- Remove `--status` flag from CLI (only keep `--convergence`)
- Remove `start` and `done` command handlers

### 15. Test Files (update or delete)
- `tests/commands/status.test.ts` - Remove status tests, add convergence tests
- `tests/commands/update.test.ts` - Remove status update tests
- `tests/services/convergence.test.ts` - Remove autoCompleteIfConverged tests

## New Display Format

**Status Display Logic:**
- `status === 'blocked'` → "blocked"
- `status === 'cancelled'` → "cancelled"
- `convergence <= 0.01` → "converged"
- `convergence === 1.0` → "pending"
- Otherwise → "not converged"

**List output (before):**
```
[np-001]: [TASK] Complete feature (P1) [in_progress] 75%
├── [1. np-002]: [BUG] Fix bug (P2) [pending] 100%
└── [2. np-003]: [EPIC] Another task (P3) [blocked] 25%
```

**List output (after):**
```
[np-001]: [EPIC] Complete feature (P1) - 0.75 (not converged)
├── [1. np-002]: [BUG] Fix bug (P2) - 0.00 (converged)
├── [2. np-003]: [TASK] Another task (P3) - 0.25 (blocked)
└── [1. np-002]: [BUG] Fix bug 2 (P2) - 1.00 (pending)
```

**View output (after):**
```
=== np-001: Complete feature ===
Type: TASK
Priority: 1
Status: not converged
Convergence: 0.25

Description:
...
```

## Commands Removed
- `np start <id>` - Removed (convergence shows progress)
- `np done <id>` - Removed (convergence <= 0.01 means converged)

## Documentation Updates

### 16. `README.md`
- Remove `np start` and `np done` from Commands table
- Remove `--status` from `np update` description (only `--convergence`)
- Update Status section: only `pending`, `blocked`, `cancelled`
- Update Quick Start: remove `np start` and `np done` examples
- Update Convergence section: remove auto-complete explanation

### 17. `COMMON_WORKFLOWS.md`
- Update all task output examples to new format
- Remove `np start` and `np done` references
- Update `--wip` filter examples (now based on convergence < 1.0)
- Remove scenarios about auto-complete
- Update `np ls --type completed` references (no longer applicable)

### 18. `src/templates/agents.ts`
- Remove `np start` and `np done` from workflow shortcuts
- Update `--status` to only support `blocked`/`cancelled`
- Update convergence examples (no auto-complete)
- Update workflow examples to remove status changes

## Commands Changed
- `np block <id>` - Still works (BLOCKED status)
- `np update <id>` - Only supports `--convergence`, not `--status`
- `np next` - Shows highest priority non-converged task
