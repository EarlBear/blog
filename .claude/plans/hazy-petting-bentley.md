# EarlBear blog — Astro + GitHub Pages (branch deploy) + blog.earlbear.com

## Context

Stand up a blog for EarlBear content and technical posts in this (currently empty) repo, `EarlBear/blog` (public). It uses the EarlBear design system (`../earlbear-design-system`, published as private GitHub Packages npm `@earlbear/ui@0.3.1`), deploys to GitHub Pages, and is served at `https://blog.earlbear.com` through a Cloudflare CNAME.

**Constraints set by user:**
- **No custom GitHub Actions** — org billing is disabled. Deploy = build locally, push output to a `gh-pages` branch, Pages set to "Deploy from a branch". This is proven in-org: `earlbear-landing` serves `discover.earlbear.com` off a branch with no workflows. (Branch deploys are executed by GitHub's internal, free "pages build and deployment" — not repo Actions.)
- **Track work in a backlog** using the `earlbear-domain` convention: `docs/tasks/backlog.md` + `docs/tasks/done.md` with the two enforcement hooks.

**Stack:** Astro v5 (markdown content collections, zero-JS static output). Tokens consumed as npm dep (`import '@earlbear/ui/tokens'`) so the blog tracks design-system releases; the token is only ever needed **locally** (no CI), which removes all CI auth complexity. v1 features: post index, post pages, tags + tag pages, RSS, sitemap, Shiki highlighting, About page, 404.

**Key design-system facts** (verified):
- Single light theme, no dark mode (intentional — do not add `prefers-color-scheme` overrides).
- Fonts via Google Fonts CDN: `IBM+Plex+Mono:wght@400;500;600` + `IBM+Plex+Sans:wght@300;400;500;600;700`.
- Semantic tokens only: `--color-canvas/surface/surface-sunken`, `--color-text(-secondary/-muted/-accent)`, `--color-border(-subtle)`, `--color-accent` (#B14726), `--space-*` (`--space-reading: 64ch`), `--radius-*`, `--fs-*`, `--shadow-*`. Utility classes shipped: `.eyebrow`, `.num`, `.mono`, `.display`.
- Package `exports` exposes only `.` and `./tokens` — SVG assets are **not importable by subpath**; copy via fs path from `node_modules/@earlbear/ui/assets/`.
- Article layout reference: `earlbear-design-system/watson/Artifacts.jsx` (ReportArtifact) — 720px centered article, eyebrow kicker, 40px/600 H1, mono meta line, uppercase-accent H2 kickers. Nav/footer reference: `earlbear-design-system/ui_kits/marketing/Marketing.jsx`.
- Brand voice: sentence case, no emoji, no exclamation points, tabular numerics.
- `assets/favicon.svg` in the package is an off-brand purple placeholder — do NOT use; derive favicon from `earlbear-icon.svg` tinted `#B14726`.

## File plan

```
.npmrc                        # @earlbear:registry=https://npm.pkg.github.com/ + ${GITHUB_PACKAGES_TOKEN}
.gitignore                    # node_modules, dist, .astro, .env, .DS_Store, public/vendor/
.pre-commit-config.yaml       # gitleaks (org convention, same as earlbear-landing)
package.json                  # astro@^5, @astrojs/rss@^4, @astrojs/sitemap@^3, @earlbear/ui@^0.3.1; devDep gh-pages
astro.config.mjs              # site: 'https://blog.earlbear.com' (no base), sitemap(), shiki 'github-light'
tsconfig.json                 # extends astro/tsconfigs/strict
CLAUDE.md                     # task-tracking convention section (adapted from earlbear-domain)
docs/tasks/backlog.md         # open tasks:  '- [ ] <task>'
docs/tasks/done.md            # closed tasks: '- [x] <task> @done(<iso>) #git:<first8>'
.claude/settings.json         # hook wiring (PreToolUse TaskUpdate guard, PostToolUse task-file check)
.claude/hooks/guard-task-deletion.py   # copied from earlbear-domain
.claude/hooks/check-task-files.py      # copied from earlbear-domain
scripts/sync-ui-assets.mjs    # copies node_modules/@earlbear/ui/assets/{icons.svg,earl-analyst.svg} → public/vendor/
                              # wired via predev/prebuild npm scripts
public/CNAME                  # blog.earlbear.com
public/.nojekyll              # branch deploys run Jekyll by default; this disables it
public/favicon.svg            # earlbear-icon.svg with color="#B14726" added to root element
src/content.config.ts         # blog collection: glob loader, zod schema
src/lib/posts.ts              # getPublishedPosts() (draft-filter + date sort), readingTime()
src/styles/global.css         # site styles + Shiki container overrides (see below)
src/layouts/BaseLayout.astro  # head (fonts, tokens import, favicon, canonical, OG, RSS/sitemap links), Nav, Footer
src/layouts/PostLayout.astro  # article shell per ReportArtifact reference
src/components/Nav.astro      # sticky 64px, blurred ivory rgba(251,249,245,.92), wordmark + Posts/Tags/About/RSS
src/components/Footer.astro   # border-top subtle, mono 12px muted, social icons via /vendor/icons.svg#<id> sprite
src/components/PostCard.astro # list row: .num date, title link, description, TagPills; border-subtle separators
src/components/TagPill.astro  # accent-soft bg, text-accent, radius-pill, fs-eyebrow → links /tags/<tag>/
src/components/FormattedDate.astro  # <time class="num"> Intl short-month format
src/components/EarlMark.astro # readFileSync from node_modules assets, set:html, strip hardcoded color attr
src/pages/index.astro         # home = post index (eyebrow + h1 + PostCard list)
src/pages/blog/[...slug].astro
src/pages/tags/index.astro
src/pages/tags/[tag].astro
src/pages/about.astro         # 720px shell, placeholder copy, earl-analyst.svg illustration
src/pages/404.astro
src/pages/rss.xml.js          # @astrojs/rss over getPublishedPosts()
src/content/blog/hello-world.md  # seed post w/ TS code fence + inline code (verifies Shiki + reset)
README.md                     # setup (token export), authoring, deploy, DNS — modeled on earlbear-landing README
```

No `.github/` directory at all.

## Key file contents (correctness-critical)

**`.npmrc`** (committed — env-var reference only, same pattern as design system):
```
@earlbear:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}
```
npm expands from the **shell env**, not `.env`. Before install: `export GITHUB_PACKAGES_TOKEN=$(grep GITHUB_PACKAGES_TOKEN ../earlbear-design-system/.env | cut -d= -f2)`. Document in README.

**Deploy scripts in `package.json`** (gh-pages devDependency; `--dotfiles` so `.nojekyll` survives; `--nojekyll` belt-and-braces):
```json
"scripts": {
  "dev": "astro dev",
  "build": "astro build",
  "preview": "astro preview",
  "predev": "npm run sync-assets",
  "prebuild": "npm run sync-assets",
  "sync-assets": "node scripts/sync-ui-assets.mjs",
  "deploy": "npm run build && gh-pages -d dist --dotfiles -m 'Deploy blog'"
}
```
`npm run deploy` builds and force-pushes `dist/` to the `gh-pages` branch. `main` stays source-only. Deploy is always run by a human locally, never auto-pushed by hooks.

**`src/content.config.ts`** (Astro v5 content layer):
```ts
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});
```
Filename = slug (no date prefix): `src/content/blog/<kebab-slug>.md` → `/blog/<slug>/`. Drafts visible in dev only.

**Shiki overrides in `global.css`** (load-bearing — tokens CSS gives every inline `code` a bg/border/padding that corrupts fenced blocks, and Shiki inlines github-light's bg on `<pre>`):
```css
.astro-code {
  background-color: var(--color-surface-sunken) !important;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  padding: var(--space-4) var(--space-5);
  font-size: var(--fs-sm);
  overflow-x: auto;
}
.astro-code code { background: transparent; border: none; padding: 0; }
```

## Task tracking (earlbear-domain convention)

Copy verbatim from `/Users/omareid/Workspace/git-earlbear/earlbear-domain`:
- `.claude/hooks/guard-task-deletion.py` — PreToolUse on `TaskUpdate`: blocks `status: deleted` unless the task text already exists in `docs/tasks/done.md` or `backlog.md`.
- `.claude/hooks/check-task-files.py` — PostToolUse on `Write|Edit|MultiEdit`: blocks edits that leave an open task in done.md or a closed task in backlog.md; also runnable as `--check` CLI.
- Hook wiring block in `.claude/settings.json`; "Task tracking convention" section in `CLAUDE.md` (adapted: `#git:<first8>`, `@done(<iso>)`, `#git:pending` backfill rule).

Seed `docs/tasks/backlog.md` with this project's work items, including the manual/external ones so nothing is lost:
- [ ] Scaffold Astro blog (config, content model, layouts, components, pages, seed post)
- [ ] [MANUAL] Cloudflare DNS: CNAME `blog` → `earlbear.github.io`, DNS only (grey cloud)
- [ ] [MANUAL] Repo Settings → Pages: Deploy from branch → `gh-pages` / root; custom domain `blog.earlbear.com`; Enforce HTTPS after cert issues
- [ ] [MANUAL] Org Settings → Pages → verify `earlbear.com` domain (prevents subdomain takeover)
- [ ] Upstream: add `"./assets/*"` export to `@earlbear/ui` and publish 0.3.2 (removes fs-path asset workaround)
- [ ] Footer social links: real profile URLs (github/x/bluesky/discord)
- [ ] apple-touch-icon.png (180px) from earlbear-icon.svg
Items completed during implementation move to `done.md` with `@done(...)` + `#git:` per the hooks.

## Deploy + DNS (manual steps, in order)

1. First `npm run deploy` creates the `gh-pages` branch (contains `index.html`, `blog/`, `rss.xml`, `CNAME`, `.nojekyll`).
2. Repo Settings → Pages → Source: **Deploy from a branch** → `gh-pages` / `(root)`.
3. Cloudflare: CNAME record, name `blog`, target `earlbear.github.io`, **DNS only (grey cloud), permanently** — GitHub must complete HTTP-01 validation to issue and renew the Let's Encrypt cert; proxying breaks silent renewals and Pages already fronts a CDN. (If proxy is ever wanted later: only after cert issuance, with Cloudflare SSL mode Full (strict).)
4. Settings → Pages → Custom domain: `blog.earlbear.com` (after the DNS record exists) → wait for DNS check + cert (minutes to ~1 hour) → **Enforce HTTPS**.
5. Recommended: org Settings → Pages → verified domains → verify `earlbear.com`.

Note: Pages custom domain settings live in repo Settings, but the `CNAME` file in the deployed branch is what branch-based Pages reads on each deploy — keeping it in `public/` prevents the custom domain from being wiped by a deploy.

## Defaults chosen (flag if you want different)

- Posts at `/blog/<slug>/`, index at `/`.
- Shiki theme `github-light` on a `--color-surface-sunken` container (swap to `vitesse-light` or custom `css-variables` later is a one-line change).
- Favicon/mark tint `#B14726` (`--color-accent`); earl-mark.svg hardcodes `#B84A2E` — we strip that and tint via CSS.
- Footer social icons: github + x with placeholder hrefs until real URLs provided (tracked in backlog).
- gitleaks pre-commit hook included (org convention; install with `pre-commit install`).

## Verification

1. `export GITHUB_PACKAGES_TOKEN=…` → `npm install` succeeds (proves registry auth).
2. `npm run dev` → check `/` (Plex fonts, ivory canvas, terra favicon), post page (Shiki block = cream bg, inline code reset OK, mono meta line, eyebrow kickers), `/tags/`, `/tags/meta/`, `/about/`, bogus URL → 404.
3. `npm run build && npm run preview` → confirm `dist/CNAME`, `dist/.nojekyll`, `dist/rss.xml`, `dist/sitemap-index.xml`, `dist/404.html`, `dist/vendor/icons.svg` exist.
4. `python3 .claude/hooks/check-task-files.py --check` passes; commit source to `main`, push.
5. `npm run deploy` → `gh-pages` branch appears on GitHub with expected contents; Pages settings step; site live at `https://earlbear.github.io/blog/` equivalent is skipped — go straight to custom domain once DNS is set.
6. `dig +short blog.earlbear.com CNAME` → `earlbear.github.io.`; `curl -sI https://blog.earlbear.com` → 200 with `server: GitHub.com`; http→https redirect after Enforce HTTPS; validate `https://blog.earlbear.com/rss.xml` at validator.w3.org/feed.

---

# Addendum — changes and additions since approval

This section records decisions made during implementation. Where it conflicts with the sections above, this addendum wins.

## A1. Design system is VENDORED, not an npm dependency (pivot)

**What changed:** The plan assumed `@earlbear/ui` consumed from GitHub Packages. In practice, **GitHub Packages tarball downloads are billing-gated and the org is over its limit** (the same limit that disables Actions) — `npm install` of the private package returns `403 billing limit`, for every version. Registry *metadata* works (`npm view`), downloads do not.

**Resolution — vendor the design system into the repo:**
- `src/styles/tokens.css` ← copied from `../earlbear-design-system/colors_and_type.css` (0.3.1 working copy; all tokens the blog uses were verified present).
- `public/vendor/{icons.svg,earl-analyst.svg,earl-mark.svg}` ← copied from the design system's `assets/`.
- Both are **committed** (removed `public/vendor/` from `.gitignore`), so builds never depend on the clone.
- `scripts/sync-ui-assets.mjs` re-pulls from the local design-system clone on demand (`npm run sync-assets`) and records the source commit in `.sync-source.json` (the `earlbear-landing` mirror pattern). **Not** wired into predev/prebuild.
- Removed: `.npmrc`, the `@earlbear/ui` dependency, and the `predev`/`prebuild` sync wiring.
- `BaseLayout.astro` imports `../styles/tokens.css`; `EarlMark.astro` reads `public/vendor/earl-mark.svg`.
- Backlog carries a task to migrate back to the npm package once billing is restored.

**Status:** DONE and verified (dev + prod build, all routes 200, Shiki code block on cream bg with inline-code reset confirmed via screenshot, favicon/mark terra-tinted, RSS valid). Fixed a UTC/local date bug in `FormattedDate.astro` (format with `timeZone: 'UTC'`).

## A2. In-session task tracking (new requirement)

Every feature we implement and every question we investigate is tracked as a live task (TaskCreate/TaskUpdate), in addition to the durable `docs/tasks/*.md` record.
- **CLAUDE.md**: add a "Track your work" subsection stating this expectation and how it relates to the durable backlog/done files.
- **Reminder hook** (gentle nudge, user-approved): a non-blocking hook that, when you're working outside plan mode with an empty live task list, prints a reminder to create tasks. Never blocks.
- **No dedicated skill** for task-tracking — the built-in Task tools + convention + nudge suffice.

## A3. `docs/features/` "why" docs with content-hash drift detection (new requirement)

**Purpose:** For each feature, capture *why* it exists and map it to the exact code blocks that implement it, so intent stays discoverable and we notice when the code behind a rationale changes.

**Anchor format** — GitHub-permalink style, clickable + provenance, stored in the feature doc:
`https://github.com/EarlBear/blog/blob/<commitId>/<path>#L<start>-L<end>`

**Drift detection — content-hash cache:**
- Cache at `docs/features/.anchors.json` (committed), keyed by `path#L<start>-L<end>` → **normalized** content hash (strip trailing whitespace / collapse blank lines so formatting-only edits don't trip it). Hash includes a small window of surrounding context lines to disambiguate identical blocks.
- Hook recomputes the current on-disk block's hash and compares to the cache. **Match → in sync. Miss → investigate (see rename handling).** Compares against the working tree (on-disk now), so drift surfaces *as you edit*, pre-commit. The `commitId` in the URL is for the human permalink only — detection never needs the pinned commit to be fetchable.

**Rename / line-shift survival (the hash's payoff):** on a cache miss the hook self-heals before flagging:
1. Try git rename detection (`--find-renames`) for a fast new-path guess.
2. Fall back to scanning the repo for a block whose hash equals the cached value.
3. **Found elsewhere (same hash) → "moved, not changed":** silently re-key the cache entry to the new `path#Lrange`, no warning.
4. **No hash match anywhere → real drift:** flag the feature doc as stale and create a "Review why-doc: `<feature>`" task.
- **One hook does both drift-check and rename self-heal** — no separate git-move hook (intercepting every way a file moves — `git mv`, plain `mv`, IDE refactor — is fragile; the hash scan is authoritative).
- Also `npm run features:check`: runs the same relocate-or-flag sweep across all anchors at once (post-refactor / pre-commit convergence).

**Cache-update boundary (who may write the cache):**
| Situation | Content hash | Cache updated by |
|---|---|---|
| File renamed / lines shifted | unchanged | **hook, automatically** (re-key, keep hash) |
| Block content edited | changed | **skill only**, after a human re-reads the why |

Auto-blessing changed content is forbidden — it would let docs rot silently.

**Reconcile (the deliberate step):** the `feature-docs` skill, after you confirm the why still holds, recomputes the block hash, bumps the URL's `commitId` to HEAD, and writes the new key→hash into the cache. This is the sole path that clears real drift.

**Skill:** one `feature-docs` skill that (a) authors a new feature doc (prompts for the why, links code anchors, seeds the cache) and (b) reconciles a stale doc.

## A4. Multi-author support + authors pages (new feature — build AFTER A2/A3 + first commit)

- **Authors collection:** `src/content/authors/<id>.md` with frontmatter `name`, `role`, `avatar`, `socials` + bio body. Its own zod schema in `content.config.ts`.
- **Posts:** add `authors: string[]` (1+, ordered) to the blog schema, referencing author ids; validate ids exist.
- **Bylines:** "By Earl and Sarah" (Intl.ListFormat), each name links to `/authors/<id>/`. Render on `PostCard` and `PostLayout`.
- **Pages:** `/authors/` (grid of author cards: avatar, name, role, short bio) + `/authors/<id>/` (full bio + that author's posts), mirroring the tags system.
- **RSS:** populate `<author>` from the post's authors.
- **Seed:** backfill `hello-world.md` and add an `earl` author (avatar = `/vendor/earl-mark.svg`).

## A5. Revised remaining sequence

1. A2 — task-tracking CLAUDE.md section + nudge hook.
2. A3 — `docs/features/` system: cache format, drift-check/rename hook, `features:check` script, `feature-docs` skill, and seed why-docs for the v1 features already built.
3. Commit source to `main` (backfill `#git:` SHAs in `done.md`); first `npm run deploy` to create `gh-pages`.
4. A4 — authors feature (with its own why-doc under the A3 system).
5. Manual DNS + Pages settings (tracked in `backlog.md`).
