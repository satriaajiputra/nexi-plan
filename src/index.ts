#!/usr/bin/env bun
import { parseArgs, normalizeFlags, getFlag, hasFlag, getArg } from "./utils/cli.js";
import { init } from "./commands/init.js";
import { add } from "./commands/add.js";
import { list } from "./commands/list.js";
import { view } from "./commands/view.js";
import { updateTask as update } from "./commands/update.js";
import { deleteTask as del } from "./commands/delete.js";
import { start } from "./commands/start.js";
import { done } from "./commands/done.js";
import { block } from "./commands/block.js";
import { work } from "./commands/work.js";
import { next as nextCmd } from "./commands/next.js";
import { find } from "./commands/find.js";
import { go } from "./commands/go.js";
import { selfUpdate } from "./commands/selfUpdate.js";
import { validateTaskType, validatePriority, validateStatus, validateConvergence } from "./utils/detect.js";
import { error, info } from "./utils/format.js";
import { TaskType, TaskStatus, type TaskPriority } from "./models/task.js";

async function main() {
  const { command, args, flags } = parseArgs(process.argv);
  const normalized = normalizeFlags(flags);

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
      const id = getArg(args, 0);
      if (!id) {
        error("Missing task ID");
        return;
      }
      await view(id);
      break;
    }

    case "update": {
      const id = getArg(args, 0);
      // If no ID provided, run self-update
      if (!id) {
        await selfUpdate();
        break;
      }

      let status: TaskStatus | undefined;
      const statusFlag = getFlag(normalized, "status");
      if (statusFlag) {
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

      await update(id, { status, convergence, description });
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

    case "start": {
      const id = getArg(args, 0);
      if (!id) {
        error("Missing task ID");
        return;
      }
      await start(id);
      break;
    }

    case "done": {
      const id = getArg(args, 0);
      if (!id) {
        error("Missing task ID");
        return;
      }
      await done(id);
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
np - CLI Task Tracking Tool

USAGE:
  np <command> [options]

COMMANDS:
  np init [prefix]              Initialize project (default prefix: np)

  np add -n "Task" [options]    Add a new task
    -n, --name <text>           Task name (required)
    -t, --type <type>           Task type: epic, task, bug (default: task)
    -p, --priority <1-5>        Priority: 1=highest, 5=lowest (default: 3)
    -d, --description <text>    Task description (@file for file input)
    --deps <id>                 Parent task ID

  np ls [options]               List tasks in tree view
    --wip                       Show only in_progress tasks
    --focus                     Show high-priority unblocked tasks
    --type <type>               Filter by type

  np view <id>                  View full task details

  np update [id] [options]        Update task (or CLI if no id)
    --status <status>           New status: pending, in_progress, completed, blocked, cancelled
    --convergence <0-1>         Convergence value (0=done, 1=not started)
    -d, --description <text>    Update description (@file for file input)

  np del <id> [--force]         Delete task (cascades to children)

  np start <id>                 Mark task as in_progress
  np done <id>                  Mark task as completed
  np block <id>                 Mark task as blocked
  np work <id>                  View task + mark as in_progress
  np next                       Show next task to work on
  np find <query>               Search tasks
  np go <query>                 Find + work on task

SMART DETECTION:
  Task name prefixes auto-detect type and priority:
    "fix:" → bug, "feat:" → task, "epic:" → epic
    "urgent:" → priority 1, "important:" → priority 2

EXAMPLES:
  np init myproj                Initialize with prefix "myproj"
  np add -n "fix: login CSS" -p 1
  np add -n "urgent: Implement auth"
  np ls --wip                   Show tasks in progress
  np work myproj-abc123         View and start working
  np done myproj-abc123         Mark as completed
  np go login                   Find and work on login task
`);
}

// Run main
main().catch((err) => {
  error(err.message);
  process.exit(1);
});
