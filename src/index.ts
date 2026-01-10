#!/usr/bin/env bun
import { parseArgs, normalizeFlags, getFlag, hasFlag, getArg } from "./utils/cli.js";
import { init } from "./commands/init.js";
import { add } from "./commands/add.js";
import { list } from "./commands/list.js";
import { view } from "./commands/view.js";
import { updateTask as update } from "./commands/update.js";
import { deleteTask as del } from "./commands/delete.js";
import { block } from "./commands/block.js";
import { work } from "./commands/work.js";
import { next as nextCmd } from "./commands/next.js";
import { find } from "./commands/find.js";
import { go } from "./commands/go.js";
import { selfUpdate } from "./commands/selfUpdate.js";
import { validateTaskType, validatePriority, validateStatus, validateConvergence } from "./utils/detect.js";
import { error, info } from "./utils/format.js";
import { TaskType, TaskStatus, type TaskPriority } from "./models/task.js";

// Read version from package.json
const VERSION = "1.0.0";

async function main() {
  const { command, args, flags } = parseArgs(process.argv);
  const normalized = normalizeFlags(flags);

  // Show version
  if (command === "version" || command === "--version" || command === "-v" || hasFlag(normalized, "version")) {
    console.log(`np v${VERSION}`);
    return;
  }

  // Show help
  if (command === "help" || hasFlag(normalized, "help")) {
    showHelp();
    return;
  }

  // Handle commands
  switch (command) {
    case "init": {
      const prefix = getArg(args, 0, "np");
      await init(prefix);
      break;
    }

    case "add": {
      const name = getFlag(normalized, "name");
      if (!name) {
        error("Missing required flag: -n, --name");
        return;
      }

      let type: TaskType | undefined;
      const typeFlag = getFlag(normalized, "type");
      if (typeFlag) {
        if (!validateTaskType(typeFlag)) {
          error(`Invalid type: ${typeFlag}. Must be: epic, task, bug`);
          return;
        }
        type = typeFlag as TaskType;
      }

      let priority: TaskPriority | undefined;
      const priorityFlag = getFlag(normalized, "priority");
      if (priorityFlag) {
        const p = parseInt(priorityFlag, 10);
        if (!validatePriority(p)) {
          error(`Invalid priority: ${priorityFlag}. Must be between 1 and 5`);
          return;
        }
        priority = p as TaskPriority;
      }

      const description = getFlag(normalized, "description");
      const deps = getFlag(normalized, "deps");

      await add({ name, type, priority, description, deps });
      break;
    }

    case "list":
    case "ls": {
      await list({
        wip: hasFlag(normalized, "wip"),
        focus: hasFlag(normalized, "focus"),
        type: getFlag(normalized, "type") as TaskType | undefined,
      });
      break;
    }

    case "view": {
      if (args.length === 0) {
        error("Missing task ID");
        return;
      }
      await view(args);
      break;
    }

    case "update": {
      const ids = args.length > 0 ? args : undefined;
      // If no ID provided, run self-update
      if (!ids) {
        await selfUpdate();
        break;
      }

      // Parse and validate priority flag
      let priority: TaskPriority | undefined;
      const priorityFlag = getFlag(normalized, "priority");
      if (priorityFlag) {
        const p = parseInt(priorityFlag, 10);
        if (!validatePriority(p)) {
          error(`Invalid priority: ${priorityFlag}. Must be between 1 and 5`);
          return;
        }
        priority = p as TaskPriority;
      }

      let status: TaskStatus | undefined;
      const statusFlag = getFlag(normalized, "status");
      if (statusFlag) {
        // Status updates only allowed for single task
        if (ids.length > 1) {
          error("Status updates are not supported for multiple tasks. Use a single task ID.");
          return;
        }
        if (!validateStatus(statusFlag)) {
          error(`Invalid status: ${statusFlag}`);
          return;
        }
        status = statusFlag as TaskStatus;
      }

      let convergence: number | undefined;
      const convFlag = getFlag(normalized, "convergence");
      if (convFlag) {
        const c = parseFloat(convFlag);
        if (!validateConvergence(c)) {
          error(`Invalid convergence: ${convFlag}. Must be between 0 and 1`);
          return;
        }
        convergence = c;
      }

      const description = getFlag(normalized, "description");

      // Description updates only allowed for single task
      if (description && ids.length > 1) {
        error("Description updates are not supported for multiple tasks. Use a single task ID.");
        return;
      }

      await update(ids, { status, convergence, priority, description, force: hasFlag(normalized, "force") });
      break;
    }

    case "delete":
    case "del": {
      const id = getArg(args, 0);
      if (!id) {
        error("Missing task ID");
        return;
      }
      await del(id, hasFlag(normalized, "force"));
      break;
    }

    case "block": {
      const id = getArg(args, 0);
      if (!id) {
        error("Missing task ID");
        return;
      }
      await block(id);
      break;
    }

    case "work": {
      const id = getArg(args, 0);
      if (!id) {
        error("Missing task ID");
        return;
      }
      await work(id);
      break;
    }

    case "next": {
      await nextCmd();
      break;
    }

    case "find": {
      const query = getArg(args, 0);
      if (!query) {
        error("Missing search query");
        return;
      }
      await find(query);
      break;
    }

    case "go": {
      const query = getArg(args, 0);
      if (!query) {
        error("Missing search query");
        return;
      }
      await go(query);
      break;
    }

    default:
      info(`Unknown command: ${command}`);
      info("Run 'np help' for usage information");
      process.exit(1);
  }
}

function showHelp() {
  console.log(`
np - CLI Task Tracking Tool v${VERSION}

USAGE:
  np <command> [options]

COMMANDS:
  np version, --version, -v     Show version information
  np init [prefix]              Initialize project (default prefix: np)

  np add -n "Task" [options]    Add a new task
    -n, --name <text>           Task name (required)
    -t, --type <type>           Task type: epic, task, bug (default: task)
    -p, --priority <1-5>        Priority: 1=highest, 5=lowest (default: 3)
    -d, --description <text>    Task description (@file for file input)
    --deps <id>                 Parent task ID

  np ls [options]               List tasks in tree view
    --wip                       Show work-in-progress tasks (convergence < 1.0 && > 0.01)
    --focus                     Show high-priority unblocked tasks
    --type <type>               Filter by type

  np view <id...>                  View full task details

  np update <id...> [options]   Update task(s) (or CLI if no id)
    -p, --priority <1-5>        Priority: 1=highest, 5=lowest
    --convergence <0-1>         Convergence value (0.01=done and tested, 1=not started)
    --status <status>           New status: blocked, cancelled (single task only)
    -d, --description <text>    Update description (@file for file input, single task only)
    --force                     Force convergence cascade to descendants (single task only)

  Multi-task updates: Can update multiple tasks with --convergence or --priority.
  Status and description updates only work with a single task ID.

  np del <id> [--force]         Delete task (cascades to children)

  np block <id>                 Mark task as blocked
  np work <id>                  View task details
  np next                       Show next task to work on
  np find <query>               Search tasks
  np go <query>                 Find and work on task

CONVERGENCE:
  Values range from 1.0 (not started) to 0.01 (completed and tested).
  Important: Only use 0.01 for completed tasks. Never use 0.0 or values below 0.01.
  - 1.0 = Not started
  - 0.5 = Halfway done
  - 0.01 = Completed, tested, and verified

SMART DETECTION:
  Task name prefixes auto-detect type and priority:
    "fix:" → bug, "feat:" → task, "epic:" → epic
    "urgent:" → priority 1, "important:" → priority 2

EXAMPLES:
  np init myproj                Initialize with prefix "myproj"
  np add -n "fix: login CSS" -p 1
  np add -n "urgent: Implement auth"
  np ls --wip                   Show tasks in progress
  np work myproj-abc123         View task details
  np update myproj-abc123 --convergence 0.5
  np update --priority 1 myproj-abc123 myproj-def456 myproj-ghi789
  np go login                   Find and work on login task
`);
}

// Run main
main().catch((err) => {
  error(err.message);
  process.exit(1);
});
