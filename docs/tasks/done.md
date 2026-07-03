# Done

Closed tasks. Format: `- [x] <task> @done(<isoTimestamp>) #git:<first8ofcommitId>`.

- `@done(...)` — ISO 8601 timestamp the task was closed.
- `#git:<first8ofcommitId>` — first 8 chars of the commit that completed the task. Use `#git:pending` until committed, then backfill with the real short SHA.

Tasks land here (or in [backlog.md](./backlog.md)) **before** being deleted from the live task list — a PreToolUse hook blocks `TaskUpdate status:deleted` otherwise. See [CLAUDE.md](../../CLAUDE.md).

- [x] Scaffold Astro blog: config, content model, layouts, components, pages, seed post @done(2026-07-03T00:00:00Z) #git:71331877
- [x] Vendor design-system CSS + assets into the repo (GitHub Packages downloads billing-blocked) @done(2026-07-03T00:00:00Z) #git:71331877
- [x] Verify dev server and production build (all routes, Shiki, RSS, favicon) @done(2026-07-03T00:00:00Z) #git:71331877
- [x] Add "track your work" task convention to CLAUDE.md + non-blocking nudge hook @done(2026-07-03T00:00:00Z) #git:71331877
- [x] Build docs/features/ "why" system: content-hash cache, rename-proof drift hook, features:check, feature-docs skill @done(2026-07-03T00:00:00Z) #git:71331877
- [x] Add Makefile with targets (dev/build/preview/deploy/sync-assets/regen-favicon/checks) @done(2026-07-03T00:00:00Z) #git:71331877
- [x] Build skills: new-post, manage-authors, feature-docs, sync-design, deploy @done(2026-07-03T00:00:00Z) #git:71331877
- [x] Regenerate favicon from earl-mark.svg (glasses mark), accent-tinted, via scripts/gen-favicon.mjs @done(2026-07-03T00:00:00Z) #git:71331877
- [x] Multi-author support: authors collection, co-author bylines, /authors/ + /authors/<id>/, RSS author @done(2026-07-03T00:00:00Z) #git:71331877
- [x] Order authors index by explicit `order` field (Sa'd before Omar) @done(2026-07-03T00:00:00Z) #git:e50a090c
- [x] Replace outdated About illustration; distill landing narrative into About page, drop deprecated earl-analyst.svg @done(2026-07-03T00:00:00Z) #git:f2c79b52
- [x] [MANUAL] Cloudflare DNS: CNAME `blog` → `earlbear.github.io`, DNS only — verified resolving to GitHub Pages IPs 185.199.108-111.153 @done(2026-07-03T00:00:00Z) #git:c825b684
