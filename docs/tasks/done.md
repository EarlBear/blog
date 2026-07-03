# Done

Closed tasks. Format: `- [x] <task> @done(<isoTimestamp>) #git:<first8ofcommitId>`.

- `@done(...)` — ISO 8601 timestamp the task was closed.
- `#git:<first8ofcommitId>` — first 8 chars of the commit that completed the task. Use `#git:pending` until committed, then backfill with the real short SHA.

Tasks land here (or in [backlog.md](./backlog.md)) **before** being deleted from the live task list — a PreToolUse hook blocks `TaskUpdate status:deleted` otherwise. See [CLAUDE.md](../../CLAUDE.md).

- [x] Scaffold Astro blog: config, content model, layouts, components, pages, seed post @done(2026-07-03T00:00:00Z) #git:pending
