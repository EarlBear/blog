# Internal post series: the agent fleet (hub + Watson + Scout)

## Context

`../earlbear-claude-agent` now packages a fleet of four codenamed autonomous agents on one
shared spine: **Watson** (overnight Jira design-work loop) and **Scout** (queue-driven
storefront auditor) are operational; **Medic** (store healer, A/B-experiment remediation) and
**Envoy** (outreach drafter, never sends) are fresh scaffolds added 2026-07-19. The roster
went 1 → 4 in a week via a repeatable `/add-agent` skill, and nothing on the internal blog
introduces it. The user wants an internal "meet our agents"-style series that can grow as
agents are added.

Decisions already made with the user:

- **Scope:** a fleet hub post + full per-agent posts for the two live agents (Watson, Scout).
  Medic and Envoy get short "scaffold — coming soon" entries in the hub only; they get their
  own posts when they go live.
- **Titles:** house voice (the `check-posts.py` advisory flags "meet X" framing). Descriptive
  titles, codenames kept as the subject.
- **Extensibility:** zero new code — a shared `fleet` tag (free auto-updating listing at
  `/tags/fleet/`) + a curated roster section in the hub. Adding an agent later = one new post
  + one hub line. This mirrors the existing `start-here-the-whole-system.mdx` hub pattern.
  No `series` schema field.

## What ships

Three new `.mdx` posts in `src/content/blog/` (filename = slug), all `audience: internal`,
all `authors: [omar]`, all tagged `[fleet, agents, engineering]`, `draft: true` initially
(internal build shows drafts; flip to false when reviewed). No code, schema, or route changes.

### 1. `the-agent-fleet.mdx` — the hub
- **Title:** "The agent fleet: who runs overnight and what each one does"
- **Questions (draft):** What agents do we run and what does each one do? · How do the agents
  hand work to each other? · How does a new agent get added to the fleet? · Which agents are
  live and which are still scaffolds?
- **Content:**
  - Standard internal breadcrumb line (`*New here? [Start with the whole system](/blog/start-here-the-whole-system)…*`).
  - The one-codebase-many-agents spine: `AGENT` env var selects a vertical under
    `agents/<name>/`; identity is a markdown character brief + `agent.json` manifest;
    secrets ride dotenvx-encrypted; capabilities come from the shared plugin marketplace.
  - **The fleet as a pipeline** (`FlowDiagram`): Scout audits public stores → findings land in
    `scan_*` tables → Envoy (scaffold) turns findings into leads filed in Watson's Jira
    pipeline; Medic (scaffold) is Scout's internal twin healing owned stores — one
    `scan_requests` queue routed by `is_internal`.
  - **Who does what** (`UseCaseDiagram`): actors Watson/Scout/Medic/Envoy + human reviewer
    against the systems they touch (Jira, Supabase queue, storefronts, Drive).
  - **Roster section — the extension point.** One short entry per agent (codename, one-line
    charter, status live/scaffold, link to its post if it has one). Medic and Envoy entries
    end with "post to follow when it goes live". An HTML comment in this section documents
    the convention: new agent → add a per-agent post tagged `fleet` → add one entry here.
  - Pointer to `/tags/fleet/` as the auto-updating list.
- **`expects:` `[flow, use-case]`**. No `design:` (the harness design docs live in
  `earlbear-claude-agent/docs`, outside the registry's `earlbear-agentic-workflow` contract —
  don't invent a slug).

### 2. `watson-the-overnight-jira-loop.mdx`
- **Title:** "Watson: the overnight Jira loop"
- **Questions (draft):** What work does Watson pick up and from where? · How does Watson know
  what to do with an issue in each Jira column? · Why can't Watson mark its own work done? ·
  What does a human find in the morning after a Watson run?
- **Content:** the EARL Kanban loop (Prioritized › Planning › In Progress › Review › Done);
  column-aware routing of issues to runtime skills (`pull-work`, `plan-issue`,
  `draft-artifact`, `review-work`, `check-out`…); the never-self-approves guardrail —
  drafts artifacts, leaves them for human review, never moves to Done; where output lands
  (Jira comments/attachments, Drive, `agent_runs` telemetry).
  - `FlowDiagram` (shape `loop` or `swimlane`): the nightly loop across Jira columns, with
    the human-review boundary explicit.
- **`expects:` `[flow]`**. No `design:`.

### 3. `scout-the-storefront-auditor.mdx`
- **Title:** "Scout: the storefront auditor"
- **Questions (draft):** Where does Scout get the stores it audits? · What does Scout actually
  do on a storefront? · Where do Scout's findings go and who reads them? · Why does the raw
  transcript never leave the VM?
- **Content:** queue-driven not URL-driven — pulls up to 3 oldest `pending_review` rows from
  the `scan_requests` Supabase queue (self-seeds when empty); walks the buy-intent journey as
  a first-time customer via the store-auditor engine (headless Chromium, LCP/CLS/TTFB);
  streams findings to the dashboard sink tables (`scan_runs`/`scan_events`/`scan_sites`);
  ships a **sanitized** transcript to Drive, raw JSONL stays on the VM; explicitly no
  Jira/Shopify writes.
  - `FlowDiagram` (shape `pipeline`): queue → audit → sink tables → dashboard/Drive, with a
    `store` node kind for the Supabase tables and the sanitization boundary marked.
- **Frontmatter:** `design: scan-fleet` (registered slug; the scan-queue/dashboard design doc
  this post narrates the agent side of). **`expects:` `[flow]`**.

## How to implement

1. Create a live task (`TaskCreate`) before editing; add a `docs/tasks/backlog.md` line.
2. Scaffold each post via the **`new-post` skill** (it owns slug/frontmatter/voice rules);
   author bodies from the exploration findings above — source facts are in
   `../earlbear-claude-agent` (`README.md` roster table, `agents/*/CLAUDE.md`,
   `agents/*/agent.json`, `architecture/`); re-read the specific lines when quoting charters.
3. Posts must be `.mdx` (components require it); import each component used
   (`import FlowDiagram from '../../components/FlowDiagram.astro';` — `check-diagrams.py`
   blocks a missing import). Use the **`enrich-post`** catalog conventions for diagram shape
   choice; `usecase-diagram` skill for the hub's UseCaseDiagram (it owns the overlap/balance
   gates).
4. Voice: sentence case, no emoji/exclamations, no anthropomorphizing beyond the codename
   framing (say "Watson never marks work Done — that's a human decision" as a rule statement,
   not feelings). No pricing/stat claims → no footnotes needed; if any figure sneaks in,
   `check-posts.py` demands an MLA footnote.
5. Cross-links: hub → both agent posts + `/tags/fleet/`; agent posts → breadcrumb to
   start-here + a "part of [the agent fleet](/blog/the-agent-fleet)" line back to the hub.

## Files touched

- `src/content/blog/the-agent-fleet.mdx` (new)
- `src/content/blog/watson-the-overnight-jira-loop.mdx` (new)
- `src/content/blog/scout-the-storefront-auditor.mdx` (new)
- `docs/tasks/backlog.md` (append task line; move to `done.md` with `#git:` on completion)

Nothing else — no schema, `posts.ts`, or page changes (tag listing pages already exist).

## Verification

- `npm run posts-check` (blocking frontmatter/citation gate) and `npm run diagrams-check`
  fire automatically per-edit via hooks; also run `npm run visuals-check`,
  `npm run reader-check`, `npm run audience-fit-check`, `npm run design-check` (validates
  `design: scan-fleet`) and `npm run design-docs-check` (sibling repo is present).
- `PUBLIC_AUDIENCE=internal npm run build` must pass (zod schema is the authoritative gate);
  also run the default external build and confirm the three posts do **not** appear in `dist/`.
- `npm run dev` — eyeball all three posts: internal badge, questions block, diagrams render
  without layout-blowout errors, hub links resolve, `/tags/fleet/` lists all three.
- Commit via the **`concurrent-commit`** skill (shared working dir; stage only these files),
  then backfill `#git:` in `docs/tasks/done.md`.
