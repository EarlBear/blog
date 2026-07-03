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
- [x] Push main + first deploy to gh-pages branch (branch published, ready for Pages source config) @done(2026-07-03T00:00:00Z) #git:57fee15c
- [x] Set up gitleaks secret-scanning hooks (.githooks pre-commit + pre-push, make install-hooks, .gitleaks.toml) — verified blocks a real PAT @done(2026-07-03T00:00:00Z) #git:1dadf345
- [x] Polish new-post skill (concrete verify commands, required questions field, body scaffold, build check) + posts-check hook @done(2026-07-03T00:00:00Z) #git:5c268695
- [x] Write "Life without EarlBear" post: growth-team roles, 2026 salary bands, A/B-test math, CSS gantt hiring timeline, interactive cost calculator (draft) @done(2026-07-03T17:00:00Z) #git:5dc35da2
- [x] Require MLA footnote citations for dollar/percent figures: citation checks in check-posts.py (ref↔def match, MLA shape on URL definitions, uncited-figure detection) @done(2026-07-03T17:00:00Z) #git:5dc35da2
- [x] new-post skill: infer author from machine username (AskUserQuestion fallback), websearch-verify claims, citation rules, widget/chart guidance, hook-failure recovery @done(2026-07-03T17:00:00Z) #git:5dc35da2
- [x] Investigate per-kind post frontmatter: single zod schema today; z.discriminatedUnion on a `kind` field is the supported path when a second post type appears @done(2026-07-03T17:00:00Z) #git:5dc35da2
- [x] Add support/operations engineer as sixth role (roles chart, gantt, calculator); recompute defaults to $102k/mo @done(2026-07-03T18:00:00Z) #git:5dc35da2
- [x] Split RACI out of the roles table into its own badge grid (distinct R/A/C/I badges, legend, scrollable) @done(2026-07-03T18:00:00Z) #git:5dc35da2
- [x] Replace salary text ranges with a bar+median-dot chart (shared axis, right-aligned value column, mobile stack) @done(2026-07-03T18:00:00Z) #git:5dc35da2
- [x] Add researched top-of-market talent premium (60–85% over median, cited) + talent-tier slider to calculator @done(2026-07-03T18:00:00Z) #git:5dc35da2
- [x] check-posts.py: detect footnote refs trapped inside raw-HTML blocks (they render literally) @done(2026-07-03T18:00:00Z) #git:5dc35da2
- [x] Add global .prose table styling (cell padding, header rule, row separators, horizontal scroll) — fixes column crowding site-wide @done(2026-07-03T18:00:00Z) #git:5dc35da2
- [x] new-post skill: tables-vs-HTML-components guidance, footnotes-in-raw-HTML caveat, verify-the-render (visual-review) step @done(2026-07-03T18:00:00Z) #git:5dc35da2
