# earlbear-blog

The EarlBear blog — a static Astro site served via GitHub Pages at
**https://blog.earlbear.com** (Cloudflare CNAME → `earlbear.github.io`).

## Architecture

- **Astro v5** static site. Posts are markdown in `src/content/blog/`; the
  filename is the URL slug (`/blog/<slug>/`). Content schema is in
  `src/content.config.ts`.
- **Design system**: styling comes from the EarlBear design system, **vendored**
  into this repo — `src/styles/tokens.css` (the tokens CSS) and
  `public/vendor/*.svg` (assets), both committed. We import the tokens once in
  `src/layouts/BaseLayout.astro` and use **semantic tokens only** — never raw
  hex. Single light theme; do not add dark-mode overrides.
  - Why vendored, not the `@earlbear/ui` npm package? GitHub Packages downloads
    are billing-gated and the org has hit its limit (same reason Actions are
    off), so `npm install` of the private package 403s. Vendoring also removes
    all token/CI auth complexity.
  - Re-pull from the design system with `npm run sync-assets` (copies from the
    local clone at `../earlbear-design-system`, recording the source commit in
    `.sync-source.json`).
- **SVG assets** live in `public/vendor/`. The Earl monogram is inlined at build
  time by `src/components/EarlMark.astro` (reading `public/vendor/earl-mark.svg`)
  so `currentColor` tinting works.
- **Brand voice**: sentence case, no emoji, no exclamation points, tabular
  numerics (`.num`).

## Local setup

Dependencies are all public — the design system is vendored, not installed:

```bash
npm install
npm run dev
```

To refresh the vendored tokens/assets from the design system (requires a clone at
`../earlbear-design-system`): `npm run sync-assets`.

## Deploy

No GitHub Actions (org billing is disabled). Deploy is a local build pushed to
the `gh-pages` branch, which GitHub Pages serves via its free built-in branch
build:

```bash
npm run deploy   # runs `astro build`, then pushes dist/ to gh-pages
```

`main` stays source-only. The `public/CNAME` and `public/.nojekyll` files ride
along in every deploy so the custom domain and raw-file serving survive.

## Common tasks (`make help`)

A `Makefile` wraps the everyday commands: `make dev|build|preview|deploy`,
`make sync-assets` / `make regen-favicon` (design system), and
`make check` (runs `tasks-check` + `features-check`). Run `make help` for the
full list.

## Skills

Guided workflows live in `.claude/skills/` (invoke with `/<name>`):

- **`new-post`** — scaffold a blog post (slug, frontmatter, voice rules).
- **`manage-authors`** — add/edit authors in `src/content/authors/`.
- **`feature-docs`** — author or reconcile `docs/features/` why-docs.
- **`sync-design`** — re-pull vendored tokens/assets from the design system.
- **`deploy`** — guided pre-flight, deploy, and live verification.

## Feature docs (the "why")

`docs/features/<id>.md` captures **why** each feature exists and links the code
that implements it via GitHub-permalink anchors. Drift is detected by content
hash (rename- and format-proof) against a cache at `docs/features/.anchors.json`;
`make features-check` auto-heals moved blocks and flags real content drift. A
`PostToolUse` hook warns (never blocks) when a documented block changes. Reconcile
stale docs via the `feature-docs` skill — the only path allowed to re-bless
changed content. See `docs/features/README.md` for the full spec.

## Track your work

Track **each feature you implement and each question you investigate** as a live
task (the built-in `TaskCreate` / `TaskUpdate` tools):

- When you start work, there should be an active task for it. If there isn't,
  create one **before** editing code — set it `in_progress`, mark it `completed`
  when done.
- Investigations count too: if you're digging into "why does X happen" or
  "which approach should we take," open a task for it so the finding is captured,
  not just the code change.
- This is separate from — and feeds — the durable `docs/tasks/` record below.
  Live tasks are the working set; `backlog.md` / `done.md` are the permanent log.

A non-blocking `UserPromptSubmit` hook (`.claude/hooks/remind-track-tasks.py`)
nudges you toward this on each turn. It is advisory and never blocks.

## Task tracking convention (durable record)

Two files under `docs/tasks/` are the durable record of work:

- **[docs/tasks/backlog.md](docs/tasks/backlog.md)** — open tasks: `- [ ] <task>`
- **[docs/tasks/done.md](docs/tasks/done.md)** — closed tasks: `- [x] <task> @done(<isoTimestamp>) #git:<first8ofcommitId>`

Rules:
1. **A task must be recorded in one of these files before it is deleted** from
   the live (in-session) task list. Closed → `done.md`; still open → `backlog.md`.
2. Closing a task = move its line from `backlog.md` to `done.md`, flip `- [ ]` →
   `- [x]`, append `@done(<isoTimestamp>)` and `#git:<first8ofcommitId>`.
3. `#git:` is the **first 8 characters** of the commit that completed the task.
   Use `#git:pending` until committed, then backfill the real short SHA.
4. **Separation invariant:** `done.md` contains **only** closed tasks (`- [x]`);
   `backlog.md` contains **only** open tasks (`- [ ]`).

### Enforcement (blocking hooks)

Two hooks, wired in `.claude/settings.json`:

- **PreToolUse / `TaskUpdate`** → `.claude/hooks/guard-task-deletion.py`:
  hard-blocks `TaskUpdate status: deleted` unless the task's text is already
  present in `docs/tasks/done.md` or `backlog.md`. The delete call must include
  the task's `subject` so the hook can confirm it.
- **PostToolUse / `Write|Edit|MultiEdit`** → `.claude/hooks/check-task-files.py`:
  after any edit touching a task file, hard-blocks if `done.md` holds an open
  task or `backlog.md` holds a closed one. Run the same check anytime with
  **`npm run tasks-check`**.
