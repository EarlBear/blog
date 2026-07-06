# Internal vs external blog — two audiences, two deploy targets

## Context

Today the blog is a single Astro static site: every non-draft post is built into
`dist/` and pushed to the `gh-pages` branch of `EarlBear/blog`, served publicly at
**blog.earlbear.com**. There is one build, one target, one CNAME.

We now need **two audiences from one repo**:

- **External** posts — unmarked (the default). Published to **blog.earlbear.com** (public).
- **Internal** posts — explicitly marked. Published to **blog.internal.earlbear.com**,
  behind a login wall so they are not world-readable even at their URL.
- **localhost** (`npm run dev`) — shows **everything** (both audiences, plus drafts), so
  authors see their full working set.

The hard requirement: **an internal post must never appear on the external site.** A leak
here is a real disclosure, so the design leans on multiple independent safety layers, not a
single filter.

### Key architectural facts that shape the design (verified)

1. **One choke point for post enumeration.** No page calls `getCollection('blog')` directly —
   everything funnels through `getPublishedPosts()` in `src/lib/posts.ts:9-16`. The home page,
   `blog/[...slug]` static paths, tag pages, author pages, and `rss.xml.js` all derive from it.
   A post excluded here is excluded from *every* route (including its own URL → 404) and the
   sitemap. This is the one filter we must get right.
2. **GitHub Pages serves exactly one custom domain per repo** (one `CNAME` per `gh-pages`
   branch), and it is **fully public — no auth wall**. blog.earlbear.com already owns that slot.
   So the internal site cannot be a second CNAME on this repo, and GitHub Pages can't provide
   the login wall internal content needs.
3. **The org already has an internal-hosting pattern**: Cloudflare Pages + Cloudflare Access
   (Google SSO, `@earlbear.com`) with instant-auth. `wireframes`, `apps`, `workflow` in
   `../earlbear-domain/domains.yaml` all use it. This is the right home for the internal blog.
4. **Domain/DNS/Access is codified in `../earlbear-domain`** (`domains.yaml` = source of truth;
   `make add-subdomain`, `make cf-access-app-upsert`, `make deploy HOST=<fqdn>`). New hosts get
   a row there, not bespoke config here.
5. **Theming lever**: `src/styles/tokens.css` is a single light theme built on CSS custom
   properties. The accent is `--color-accent` → `--eb-earl-500` (`tokens.css:98-102`). A small
   scoped override on the internal build recolors the whole site with no component edits.
6. **Env parameterization does not exist yet** — the only build-time env reads are Astro's
   `import.meta.env.DEV`/`.PROD`. We introduce the first `PUBLIC_*` var.

### Decisions locked with the user
- Internal host = **Cloudflare Pages + CF Access** (real login wall).
- Internal marker = **`audience: internal`** enum in frontmatter; external posts stay unmarked.
- **Validation hooks required** — a defense-in-depth safety net so internal posts never ship
  externally.

---

## The audience model

A single build-time env var selects what a build contains:

| Build | `PUBLIC_AUDIENCE` | Shows | Where it goes | Auth |
|---|---|---|---|---|
| dev (`npm run dev`) | unset → treated as "all" | external + internal + drafts | localhost:4343 | — |
| external (`make deploy`) | `external` | non-draft **external only** | blog.earlbear.com (gh-pages) | public |
| internal (`make deploy-internal`) | `internal` | non-draft **internal only** | blog.internal.earlbear.com (CF Pages) | CF Access (Google SSO) |

The external build is the **default and the safe one**: `audience` defaults to `external`, and
the external filter is an allowlist (`audience === 'external'`), so any post that forgets the
field, or has a typo'd/unknown value, lands external-only-if-explicitly-external — a typo makes
a post *disappear*, never *leak*. (See safety layer 1.)

---

## Implementation

### 1. Schema — add the `audience` field
**`src/content.config.ts`** (mirror the existing `draft` field at line 28):
```ts
audience: z.enum(['external', 'internal']).default('external'),
```
External posts need no change. Internal posts add `audience: internal`. The zod enum rejects
any other value at build time (safety layer 3).

### 2. The central filter — `src/lib/posts.ts`
This is the security-critical change. Replace the single `DEV`/draft check in
`getPublishedPosts()` (`src/lib/posts.ts:9-16`) with an explicit two-axis filter:

- **draft axis** (unchanged intent): drafts shown in `DEV`, excluded from any prod build.
- **audience axis** (new):
  - `import.meta.env.DEV` → show **all** audiences (localhost sees everything).
  - `PUBLIC_AUDIENCE === 'internal'` → keep **only** `data.audience === 'internal'`.
  - otherwise (external build, the default) → keep **only** `data.audience === 'external'`.

Written as an **allowlist per target** (`===`), never a denylist (`!==`), so an unexpected
value is never served on the external site. Read the var once via
`import.meta.env.PUBLIC_AUDIENCE`. All downstream helpers (`getTagsWithCounts`) and every page
inherit this automatically — no per-page edits.

### 3. Visual differentiation — internal theme + badge
- **Accent recolor (build-time, scoped).** In `src/layouts/BaseLayout.astro`, when the build is
  internal, set `data-audience="internal"` on `<html>` and ship a small style block that
  overrides the accent semantic tokens (`--color-accent`, `--color-accent-hover`,
  `--color-accent-press`, `--color-accent-soft`, `--color-border-focus`) to a clearly different
  hue from the design palette (e.g. the teal ramp `--eb-info` / `#2A6F7A`, already AA on ivory).
  This flips links, focus rings, buttons, and accents site-wide with zero component edits and no
  raw hex in components (we reference existing primitives). Honors "semantic tokens only."
- **Site chrome marker.** Show an unmistakable "Internal" pill in the nav/header on internal
  builds (gated by the same `PUBLIC_AUDIENCE` check) so there is never ambiguity about which
  site you're on. Reuses the badge pattern from `PostCard.astro:21,62-71`.
- **Per-post badge (dev only).** On localhost (where both audiences show together), render an
  "internal" badge on `PostCard` for internal posts — mirrors the existing "draft" badge — so
  authors can tell them apart in the mixed list. On the single-audience prod builds it's
  redundant (whole site is one audience), so it's primarily a dev affordance.

### 4. Build + deploy plumbing
**`package.json`** — parameterize by env, add an internal path:
- `build` stays `astro build` (external is the default; `PUBLIC_AUDIENCE` unset → external via
  the default). Add an explicit `build:external` = `PUBLIC_AUDIENCE=external astro build` for
  clarity.
- `build:internal` = `PUBLIC_AUDIENCE=internal astro build`.
- Keep `deploy` (external, gh-pages) exactly as today.
- Add `deploy:internal` = build internal, then `wrangler pages deploy dist/ --project-name
  earlbear-blog-internal --branch main --commit-dirty=true` (mirrors the earlbear-sites CF Pages
  pattern; `--branch main` so the custom domain serves the canonical deploy, not a preview).
  Add `wrangler` as a devDependency (as earlbear-sites does).

**Per-target `site` / CNAME (`astro.config.mjs`).** Absolute URLs (RSS, sitemap, canonical) must
match the host they're served on. Read `PUBLIC_AUDIENCE` in the config and set `site` to
`https://blog.internal.earlbear.com` for the internal build, else `https://blog.earlbear.com`.
The public `CNAME`/`.nojekyll` are for GitHub Pages (external) only — CF Pages does not use a
CNAME file, so the internal build's stray `dist/CNAME` must be removed before/within the CF
deploy (a step in `deploy:internal`) so it can't accidentally claim the external domain.

**`Makefile`** — add `deploy-internal` (wraps `npm run deploy:internal`) and
`build-internal`, alongside the existing `deploy`/`build`, each with a `##` help line.

### 5. DNS + Access provisioning (in `../earlbear-domain`, not this repo)
This is what makes "internal" a real access boundary, not just an unlisted URL. Following the
existing consolidation pattern (identity/DNS/Access live in `earlbear-domain`; deploy stays
here and *calls in*):
- **Create the CF Pages project** `earlbear-blog-internal` (wrangler, one-time) and attach the
  custom domain `blog.internal.earlbear.com`.
- **Gate it under CF Access**: `make -C ../earlbear-domain cf-access-app-upsert
  DOMAINS="blog.internal.earlbear.com,earlbear-blog-internal.pages.dev" APP="EarlBear Blog
  (internal)" EMAIL_DOMAIN=earlbear.com` — Google SSO, `@earlbear.com`, instant-auth, exactly
  like `wireframes`/`apps`.
- **Add the `domains.yaml` record** for `blog.internal` (class `cf-pages`, `proxied: true`,
  `expect_http: access-gate`) **with a `deploy:` spec** pointing back here:
  `{ repo: "../earlbear-blog", cmd: "make deploy-internal" }`. Then
  `make deploy HOST=blog.internal.earlbear.com` works from the domain repo, and
  `make validate-all` covers the new host.
  (The existing external `blog` record already has `deploy: { repo: "../earlbear-blog", cmd:
  "make deploy" }` — the internal one sits right beside it.)

---

## Safety mechanisms — internal posts must never publish externally

Layered so no single mistake can leak internal content:

1. **Allowlist filter, safe default (code).** `getPublishedPosts()` keeps *only*
   `audience === 'external'` on the external build; `audience` defaults to `external` but the
   filter is a positive match, so a missing/typo'd/unknown value is **not** served externally.
   Fail-closed by construction.
2. **Build-time guard hook — `check-audience.py` (new, blocking).**
   - As a **PostToolUse hook** (wired in `.claude/settings.json` next to `check-posts.py`):
     validate that every post's `audience`, if present, is exactly `external` or `internal`
     (catches typos before zod even runs) — advisory nudge.
   - As a **build gate** (`npm run audience-check`, and called at the top of `deploy` and
     `deploy:internal`): the real teeth. It **greps the produced `dist/` after an external
     build** and hard-fails (non-zero exit, aborting the deploy) if any internal post's slug,
     title, or `audience: internal` marker appears anywhere in the external `dist/` (HTML,
     rss.xml, sitemap). This checks the *actual output*, so it catches a filter regression, a
     mis-set env var, or a stray build artifact — not just source intent. Symmetric optional
     check on the internal build (no external posts present) for completeness.
3. **Schema enforcement (zod).** `z.enum(['external','internal'])` fails the build on any other
   value — no silent pass-through.
4. **Env-var assertion in deploy scripts.** `deploy` asserts `PUBLIC_AUDIENCE` is unset or
   `external` (never `internal`) before pushing to gh-pages; `deploy:internal` asserts it is
   `internal`. A wrong-target invocation aborts instead of publishing.
5. **CNAME hygiene.** The internal deploy strips `dist/CNAME` (which says `blog.earlbear.com`)
   before the CF Pages push, so the internal artifact can never claim the external hostname.
6. **Access wall (infra).** Even in the worst case where an internal post's URL is known, CF
   Access (Google SSO, `@earlbear.com`) blocks anyone outside the org from loading it — the
   external site never contains it, and the internal site never serves it unauthenticated.

Layers 1–5 keep internal content out of the external *artifact*; layer 6 guarantees the
internal *site* is not world-readable. The guard hook (2) is the linchpin the user asked for:
it inspects real output, so it survives refactors of the filter.

---

## Files touched (summary)

**In this repo (`earlbear-blog`):**
- `src/content.config.ts` — add `audience` enum.
- `src/lib/posts.ts` — two-axis allowlist filter in `getPublishedPosts()`.
- `src/layouts/BaseLayout.astro` — `data-audience` + scoped accent-token override + internal
  chrome marker, gated by `PUBLIC_AUDIENCE`.
- `src/components/PostCard.astro` — dev-only "internal" badge (mirrors draft badge).
- `astro.config.mjs` — per-audience `site`.
- `package.json` — `build:external`/`build:internal`/`deploy:internal`/`audience-check`
  scripts; add `wrangler` devDep.
- `Makefile` — `build-internal` / `deploy-internal` targets.
- `.claude/hooks/check-audience.py` (new) + wire into `.claude/settings.json`.
- Docs: `CLAUDE.md` (architecture + deploy sections), `docs/features/` why-doc for the audience
  split, and a `backlog.md`/`done.md` task line.

**In `../earlbear-domain` (separate, calls back here):**
- `domains.yaml` — new `blog.internal` record (cf-pages, access-gate, `deploy:` → this repo).
- One-time: `cf-access-app-upsert` for the internal app + wrangler Pages project + custom-domain
  attach.

---

## Verification (end-to-end)

1. **Fixtures.** Add/flag one post `audience: internal` and confirm an existing post is
   external (unmarked).
2. **Dev shows all.** `npm run dev` → home page lists both the internal and external post; the
   internal one carries the badge. Its `/blog/<internal-slug>/` page renders.
3. **External build excludes internal.** `npm run build:external` (or `npm run build`), then:
   - `grep -r "<internal-slug>" dist/` returns **nothing** (no page, not in `rss.xml`, not in
     `sitemap-0.xml`).
   - Visiting the internal slug in `npm run preview` → 404.
   - `npm run audience-check` on this `dist/` → passes (exit 0). Deliberately break the filter
     and confirm it **fails** (exit ≠ 0) — proves the guard has teeth.
   - Site accent is the normal terracotta; no "Internal" chrome marker.
4. **Internal build excludes external.** `npm run build:internal`, then `grep` confirms the
   external post is absent, the internal post present; accent is the distinct hue; "Internal"
   marker shows; `site`/canonical/RSS URLs read `blog.internal.earlbear.com`.
5. **Deploy dry-runs.** `make deploy-internal` locally (up to the wrangler step) to confirm the
   pipeline builds and strips `dist/CNAME`. From `../earlbear-domain`,
   `make deploy HOST=blog.internal.earlbear.com` (dry-run) resolves the new record.
6. **Live (after infra).** `make validate-all` in `../earlbear-domain` shows `blog.internal`
   green (access-gate); load blog.internal.earlbear.com signed-out → redirected to Google SSO;
   signed in as `@earlbear.com` → internal posts render; blog.earlbear.com unchanged and free of
   internal content.

---

## Open items to confirm during implementation
- **CF Pages project name**: proposed `earlbear-blog-internal` (matches the `earlbear-<x>`
  convention). Confirm before creating.
- **Internal accent hue**: proposed teal (`--eb-info` / `#2A6F7A`, already in the palette and
  AA on ivory). Easy to swap if you want a different signal color.
