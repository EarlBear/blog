# earlbear-blog

The EarlBear blog — a static Astro site served via GitHub Pages at
**https://blog.earlbear.com** (Cloudflare CNAME → `earlbear.github.io`).

## Architecture

- **Astro v5** static site. Posts are markdown in `src/content/blog/`; the
  filename is the URL slug (`/blog/<slug>/`). Content schema is in
  `src/content.config.ts`. Every post requires a `questions` list (the questions
  it answers, from the request that prompted it) — rendered at the top of the
  post and enforced by `check-posts.py` (a PostToolUse hook + `make posts-check`)
  in addition to the zod schema. Use the `new-post` skill to scaffold posts.
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

## Secret scanning

A gitleaks scan runs on every commit and push via git hooks in `.githooks/`
(pre-commit scans staged changes; pre-push scans the tree). Wire them once after
cloning:

```bash
make install-hooks   # sets core.hooksPath to .githooks (needs: brew install gitleaks)
```

`make scan` runs a full scan on demand. Config + allowlist live in `.gitleaks.toml`.

## Concurrent sessions (shared working dir — read before committing)

Several sessions often edit this repo **at the same time, sharing one working
directory and one `.git`** (the `Workspace/` and `workplace/` paths are the same
folder on a case-insensitive filesystem — same tree, index, `HEAD`, and branch).
The rule that keeps work safe: **bundle rather than lose, and never rewrite shared
history.**

- **Stage only your own files** — `git add <your paths>`, **never `git add .` /
  `git add -A`** when committing. That makes *staged = your work* and
  *unstaged/untracked = another session's WIP*.
- **A `post-commit` hook auto-captures** the other sessions' leftover WIP into a
  separate `chore: auto-capture concurrent changes` commit (tagging a
  `backup/<ts>` ref first), so nothing is ever left exposed. Your own commit stays
  clean.
- **Never `amend` / `reset --hard` / `rebase` a commit you didn't just create** —
  append instead. A `pre-rebase` hook blocks ad-hoc rebases unless
  `EB_ALLOW_REWRITE=1`. `pull.rebase` replays your work on top automatically when
  others' commits land below.
- **Task logs are append-only** — add your line to `backlog.md` / `done.md`; never
  rewrite lines you didn't add.
- Wired by `make install-hooks` (also sets the concurrency git config). Full flow
  and the **recovery playbook** (reflog + `backup/` tags) live in the
  **`concurrent-commit`** skill — use it if a commit collides or work seems lost.

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
- **`frontend-audit`** — audit + optimize the site (perf, a11y, SEO, bundle,
  mobile) with a headless-Chrome pass; two-tier fixes (functional-equivalent vs.
  behavior-shifting) applied only on approval. Also governs when to run an A/B
  test and how to document the evidence.
- **`concurrent-commit`** — commit safely when multiple sessions share this
  working dir; auto-capture others' WIP, replay yours on top, and recover any
  work that seems lost (reflog + `backup/` tags).
- **`usecase-diagram`** — author a UML use-case diagram with `<UseCaseDiagram>`
  (two-sided actor layout, overlap-minimizing order, the blocking overlap/balance
  gates, and the click-to-focus detail modal).
- **`enrich-post`** — add a diagram/visual to an existing post; picks a technique
  from the diagram catalog (flow/loop/pipeline via `FlowDiagram`, decision via
  `Accordion`, use-case, and our extended-Mermaid parser path).

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
