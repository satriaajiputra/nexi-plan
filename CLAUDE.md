
Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";
import { createRoot } from "react-dom/client";

// import .css files directly and it works
import './index.css';

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.

---

# nexi-plan: CLI Task Tracking Tool

## Project Overview

YOLO-friendly CLI task tracker with hierarchical tasks, convergence tracking, and Claude Code integration.

## Task Conventions

**Types:** `epic` (weight 1.0), `task` (weight 2.0), `bug` (weight 3.0)
**Priority:** 1=highest, 5=lowest (default: 3)
**Status:** `pending`, `in_progress`, `completed`, `blocked`, `cancelled`

**Smart Detection:**
- `"fix:"` prefix → bug type
- `"feat:"` prefix → task type
- `"epic:"` prefix → epic type
- `"urgent:"`/`"critical:"` → priority 1
- `"important:"` → priority 2

## CLI Commands

| Command | Description |
|---------|-------------|
| `np init [prefix]` | Initialize project (default prefix: np) |
| `np add -n "name" [-t type] [-p priority] [-d desc] [--deps id]` | Add task |
| `np ls [--wip] [--focus] [--type <type>]` | List tasks |
| `np view <id>` | View task details |
| `np update <id> [--status\|--convergence\|--description]` | Update task |
| `np del <id> [--force]` | Delete task (cascades) |
| `np start\|done\|block <id>` | Workflow shortcuts |
| `np work <id>` | View + mark in_progress |
| `np next` | Show next task to work on |
| `np find\|go <query>` | Fuzzy search (go = find + work) |

## Database

- Uses `bun:sqlite` with table `tasks` having columns: `hash_id`, `name`, `type`, `priority`, `status`, `convergence`, `description`, `parent_id`
- Database located at `.plan/tasks.db`
- Config at `.plan/config.json`

## Convergence

Parent convergence = weighted average of children's convergence.
- Excludes cancelled tasks
- Propagates bottom-up on child updates

## Development

```bash
bun run src/index.ts <command>        # Run CLI
bun run build                         # Compile binary to bin/np
bun run typecheck                     # Type check
```
