# Move the Repo Map into the internal blog as a standalone page

## Context

`https://wireframes.earlbear.com/artifacts/repo-map/` is an interactive "Repo Map"
artifact that currently lives in **`../earlbear-sites`** (`claude-artifacts/repo-map/`).
It's a single self-contained HTML file: a **Mermaid flowchart of every `earlbear-*`
repo**, grouped into 6 role-based subgraphs, with a **click-through side-drawer** per
repo (purpose, stack, GitHub remote, and clickable inbound/outbound interconnections).
It's already `audience: internal` in both its `prompt.md` and the sites `catalog.json`.

We want it to live in **exactly one place**: the org-only internal blog
(`blog.internal.earlbear.com`). Per the decisions taken:

- **Format:** a **standalone internal page** (a reference tool, not a blog post — no
  narrative article, no `questions` block).
- **Source:** **removed from the sites gallery** after the move, so it isn't
  maintained in two repos.

### Why embed the artifact as-is (not rebuild it natively)

The blog has a house diagram engine (`FlowDiagram` over `@earlbear/ui/diagram`) that
renders zero-dep build-time SVG with a click-to-focus modal. It is **not** a drop-in
substitute here:

- The engine's Mermaid parser (`parseMermaidFlow`, `node_modules/@earlbear/ui/dist/diagram/index.js:24`)
  reads only flowchart direction + nodes + edges — it **ignores `subgraph`**. The
  repo-map's defining feature is its 6 role subgraphs, which have no native counterpart.
- `FlowDiagram`'s modal shows step detail; it has no equivalent of the artifact's
  repo drawer with clickable interconnection rows that re-focus the drawer.

Reproducing both would mean real engine/component work (a new grouped shape + a drawer)
— out of scope for "standalone page." So we **port the existing artifact HTML verbatim**
and serve it as a self-contained page. A future native `RepoMap.astro` component can be
a separate task if we later want to drop the Mermaid CDN dependency.

### The one real risk this plan must close

The blog's audience safety net gates **only `getCollection('blog')` posts** — via the
allowlist in `getPublishedPosts()` (`src/lib/posts.ts`) and the `scan_dist` post-slug
scan in `.claude/hooks/check-audience.py`. A **standalone page or a `public/` file is
NOT audience-gated** and would render on the *external* build too, defeating the internal
guarantee. The plan therefore self-guards the page at build time and extends the deploy
guard to cover it.

## Approach

Serve the repo-map as a **self-guarded Astro page** that emits its markup only on the
internal build, mirroring the existing `src/pages/bench/diagram.astro` PROD-404 pattern
(`src/pages/bench/diagram.astro:19`) — except gated on audience, not on dev/prod.

### 1. Vendor the artifact + its token dependency

- Copy `../earlbear-sites/claude-artifacts/repo-map/artifact.html` into the blog. It
  currently links `../earlbear-tokens.css` (the sites design-system token file). Our
  blog vendors tokens at `src/styles/tokens.css`. Verify the artifact's `--eb-*` /
  `--fs-*` / `--fw-*` / `--ls-*` / `--dur-*` / `--ease-*` tokens exist in our
  `tokens.css`; if the sites token file is a superset, vendor the few missing tokens or
  point the artifact at our file. (Reconcile during implementation — a quick diff of the
  two token sets.)
- Keep the artifact's own Mermaid-via-CDN `<script>` and Google Fonts links — this is an
  internal, access-gated page, so the external-CSP / offline constraints that govern
  public posts and Artifacts do **not** apply here.

### 2. Create the guarded page — `src/pages/repo-map.astro`

- At the top, gate on audience: render nothing on the external build.
  ```
  import { isInternalBuild } from '../lib/posts.ts';
  if (import.meta.env.PROD && !isInternalBuild()) {
    return new Response(null, { status: 404 });
  }
  ```
  This reuses the existing `isInternalBuild()` helper (`src/lib/posts.ts`) and matches
  the `bench/diagram.astro` guard idiom. On `astro dev` it renders (dev shows everything);
  on the external prod build it 404s and emits nothing.
- Decide the embed mechanism (implementation detail, pick during build):
  - **Preferred:** inline the artifact body into the page via `set:html` of the raw HTML
    string (read at build time), wrapped in `BaseLayout` so it gets the internal chrome
    (Nav + "internal" marker). The artifact's `<style>`/`<script>` ride along inline.
  - **Simpler fallback:** keep the artifact fully self-contained (its own `<head>`) and
    serve it as a standalone document without `BaseLayout`. Loses the blog nav but is a
    zero-touch port. (Recommend the `BaseLayout` embed for a consistent internal shell.)
- Do **not** put the file in `public/` — a `public/` asset ships on *both* builds with no
  guard, which is exactly the leak we're avoiding.

### 3. Close the audience-guard gap for standalone pages

Extend `scan_dist()` in `.claude/hooks/check-audience.py` (around line 153) so the
external-build dist scan also **fails if `dist/repo-map/` (or `repo-map.html`) exists**,
and if the string `repo-map` / the artifact's `<h1>Repo Map</h1>` marker appears in the
external HTML blob. Today the guard only knows about `/blog/<slug>/` post leakage; this
adds the one standalone internal route to "the teeth" so a regression can't silently ship
it publicly. (The `isInternalBuild()` guard in step 2 is the primary defense; this is the
belt-and-suspenders dist check that survives a refactor, consistent with the layered
model in `docs/features/audience-split.md` and `CLAUDE.md`.)

### 4. Link it into the internal chrome (optional but recommended)

`src/components/Nav.astro` renders internal-only chrome behind its `internal` prop. Add a
**"Repo Map"** nav link shown only when `internal` is true (the block already branches on
`internal` for the sign-out/email UI), so the page is discoverable on the internal site
and invisible on the external one.

### 5. Remove the artifact from the sites gallery (second repo)

In **`../earlbear-sites`**:

- Delete `claude-artifacts/repo-map/` (`artifact.html` + `prompt.md`).
- Remove the `repo-map` entry from `claude-artifacts/catalog.json` (the object at
  `claude-artifacts/catalog.json:259`, slug `"repo-map"`).
### 6. Move the `manage-repo-map` skill into the blog (decided)

The skill keeps the artifact's embedded `REPOS`/`EDGES` honest against the live
`earlbear-*` ecosystem. It moves to the blog, co-located with the artifact:

- Copy the 3 files from `../earlbear-sites/.claude/skills/manage-repo-map/` (`SKILL.md`,
  `scripts/scan-repos.mjs`, `scripts/test_scan_repos.mjs`) into the blog's
  `.claude/skills/manage-repo-map/`.
- Fix the two path defaults in `scan-repos.mjs` (around lines 302–305): `repoRoot` is
  resolved relative to the skill dir, and the default `--artifact` path points at
  `claude-artifacts/repo-map/artifact.html`. Repoint the artifact default at the blog's
  new location (from step 1), and confirm the sibling-scan `--root` default still resolves
  to the `earlbear-*` parent dir from the blog's tree (blog lives at
  `~/Workspace/git-earlbear/earlbear-blog`, so the two-levels-up default may need
  adjusting — verify with `--root` explicit first).
- Add a `repo-map-check` target to the **blog's** `Makefile` mirroring the sites one
  (`node .claude/skills/manage-repo-map/scripts/scan-repos.mjs`), and wire it into
  `make check` alongside `tasks-check` / `features-check` if drift should gate routinely.
- Update `SKILL.md`'s references from `claude-artifacts/repo-map/artifact.html` to the
  blog path, and its "Related skills" table (which points at sites' `build-artifact`).
- Delete the skill + the `repo-map-check` target from `../earlbear-sites` as part of the
  step-5 sites cleanup.
- Run `node .claude/skills/manage-repo-map/scripts/test_scan_repos.mjs` after the move to
  confirm the scanner still passes its own tests against the relocated artifact.

## Files

- **New:** `src/pages/repo-map.astro` (guarded page embedding the artifact).
- **New (vendored):** the artifact HTML — either inlined in the page or committed as a
  build-time-read `.html` under `src/` (not `public/`). Possibly a few token additions to
  `src/styles/tokens.css`.
- **Edit:** `.claude/hooks/check-audience.py` — extend `scan_dist()` to cover the
  standalone route.
- **Edit:** `src/components/Nav.astro` — internal-only "Repo Map" link.
- **Move (from `../earlbear-sites`):** `.claude/skills/manage-repo-map/` (3 files) into
  the blog, repointed at the new artifact path; add the `repo-map-check` Makefile target
  to the blog.
- **Delete (in `../earlbear-sites`):** `claude-artifacts/repo-map/` + its
  `catalog.json` entry; the `manage-repo-map` skill and its `repo-map-check` Makefile
  target.
- **Record:** append the task to `docs/tasks/done.md` on completion (per CLAUDE.md task
  convention); a live `TaskCreate` task tracks it in-session.

## Verification

1. **Renders internally, hidden externally (the core guarantee):**
   - `PUBLIC_AUDIENCE=internal npm run build` → confirm `dist/repo-map/index.html`
     exists and contains the diagram markup.
   - `npm run build` (external, default) → confirm **no** `dist/repo-map/` is emitted.
   - Run the guard against the external dist: `npm run audience-check` /
     `node .claude/hooks/check-audience.py --check-dist dist --audience external` →
     passes, and (sanity) an intentionally-mis-built internal page in an external dist is
     caught by the new `scan_dist` rule.
2. **Interactive behavior intact:** `npm run dev`, open `/repo-map/`, verify with the
   Chrome MCP tools — the Mermaid diagram renders with no console errors, clicking a node
   opens the drawer with correct repo detail, and clicking an interconnection row
   re-focuses the drawer (the artifact's `prompt.md` "Verify" section is the checklist).
3. **Tokens resolve:** no unstyled/`var(--…)`-fallback flashes; the page reads as
   warm-paper with the group-colored legend.
4. **Internal chrome:** the "internal" Nav marker shows and (if added) the "Repo Map" link
   appears; on an external dev preview the link is absent.
5. **Skill moved & working:** in the blog, `make repo-map-check` runs the relocated
   scanner against the new artifact path and reports in-sync (or real drift), and
   `node .claude/skills/manage-repo-map/scripts/test_scan_repos.mjs` passes.
6. **Sites cleanup:** in `../earlbear-sites`, the gallery no longer lists Repo Map, the
   `claude-artifacts/repo-map/` dir is gone, and the skill + `repo-map-check` target are
   removed.
