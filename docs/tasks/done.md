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
- [x] Track A: build UseCaseDiagram component (build-time inline-SVG UML use-case diagrams — Earl-mark actor, oval use cases, gradients, ambient drift + draw-in animation, reduced-motion + mobile-safe) + proof post `earlbear-use-cases.mdx` + feature doc; add `@astrojs/mdx`, widen content glob + check-posts.py to `.mdx` @done(2026-07-04T00:00:00Z) #git:6fce5aa7
- [x] Track C: build diagram perf + A/B harness (`scripts/diagram-bench.mjs`, `make bench-diagram`, dev-only `src/pages/bench/diagram.astro`) — measures animated/static/image variants on desktop+mobile via headless-Chrome CDP (doc weight, FCP, CLS, long-frames) → `docs/diagram-bench.md`; evidence cited in the feature doc + proof post @done(2026-07-04T00:00:00Z) #git:6fce5aa7
- [x] Track B: build `frontend-audit` skill (local + advisory headless-Chrome audit: perf/a11y/SEO/bundle/mobile; two-tier fixes applied only on approval; governs when to A/B test + how to gather and document evidence) + wire into CLAUDE.md skills list; add evidence-citation guidance to new-post skill @done(2026-07-04T00:00:00Z) #git:6fce5aa7
- [x] Concurrent-session safety: post-commit auto-capture of other sessions' WIP (`scripts/concurrent-capture.sh` + `.githooks/post-commit`, backup/<ts> tags), pre-rebase guard against history rewrites, pull.rebase/autoStash/rerere replay config (`scripts/setup-concurrency.sh`), `concurrent-commit` skill + recovery playbook, CLAUDE.md concurrency rules @done(2026-07-04T00:00:00Z) #git:cbf7ba3d
- [x] UseCaseDiagram layout quality: two-sided actors (internal/system left, external right), overlap-minimizing use-case order, barycenter actor placement, blocking build-time overlap gate (≥75% crossing-free) + actor line-angle balance gate, `allowOverlap` escape hatch @done(2026-07-04T00:00:00Z) #git:e0c0e4c1
- [x] UseCaseDiagram click-to-focus detail modal (progressive-enhancement native `<dialog>`; use-case detail + actors + include/extend; zero-JS fallback); `detail` field on UseCase; proof-post use cases filled in @done(2026-07-04T00:00:00Z) #git:deb29e30
- [x] Create `usecase-diagram` authoring skill (spec, two-sided layout, overlap-min ordering, the two blocking gates, the modal) + wire into CLAUDE.md; update feature doc @done(2026-07-04T00:00:00Z) #git:9fad7dec
- [x] Build FlowDiagram primitive (pipeline/loop/sequence): zero-dep build-time inline SVG, gradient nodes, edge/store/external node kinds, blocking overlap gate, draw-in animation, click-to-focus modal, auto-loop from back-edge @done(2026-07-04T00:00:00Z) #git:a10de26
- [x] Build "our extended Mermaid": zero-dep parser (mermaid-parse.ts) for the Mermaid flowchart subset → FlowDiagram; verified no pure-JS Mermaid renderer works here (getBBox on jsdom/svgdom fails on Node 20+22), so we parse not render — no browser, no dep @done(2026-07-04T00:00:00Z) #git:a10de26
- [x] Build Accordion foldable-options component (native details/summary, zero JS, verdict pills) for decision posts @done(2026-07-04T00:00:00Z) #git:a10de26
- [x] Enrich 4 proof posts (→.mdx): agentic-workflow (loop), mining-transcripts (pipeline w/ edge boundary), from-one-laptop (architecture), one-database-two-modes (accordion) @done(2026-07-04T00:00:00Z) #git:a10de26
- [x] Build enrich-post skill + living catalog.md (technique table + Mermaid decision rule) + wire into CLAUDE.md; fix new-post dangling dataviz ref; diagram-catalog feature doc @done(2026-07-04T00:00:00Z) #git:a10de26
- [x] Enrich via /enrich-post: syncing-append-only-transcripts (rewind-guard decision flow, FlowDiagram sequence) + what-we-never-collect (raw-stays trust-boundary pipeline); note branch-layout gap in catalog.md @done(2026-07-04T00:00:00Z) #git:38a012f6
- [x] Add FlowDiagram shape="branch": layered top-down layout that fans a fork's outcomes into a row with labeled edges (passes overlap gate, no allowOverlap); re-render syncing rewind-guard as a branch; close the catalog gap @done(2026-07-04T00:00:00Z) #git:pending
- [x] Enrich a-pitch-deck-that-reads-its-own-numbers (→.mdx): "one selector, two surfaces" branch — marts → shared selector → deck + dashboard @done(2026-07-04T00:00:00Z) #git:pending
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
- [x] Investigate failed Pages deploy: auto pages-build-deployment deploy step failed server-side ("try again later"); site still served prior build @done(2026-07-03T19:00:00Z) #git:pending
- [x] Order post byline + RSS authors by author `order` field (then name) to match the authors index, not post frontmatter order @done(2026-07-03T19:00:00Z) #git:c6db727b
- [x] Harden deploy skill: watch pages-build-deployment run to completion via gh CLI, verify NEW content (not site-up), document gh debugging + deploy-failure recovery @done(2026-07-03T19:00:00Z) #git:1a8f5211
