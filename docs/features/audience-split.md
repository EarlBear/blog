# Internal vs external audience split

## Why

The blog needed to serve two audiences from one repo and one set of source posts:

- **External** posts — the public blog at **blog.earlbear.com** (GitHub Pages).
- **Internal** posts — an org-only blog at **blog.internal.earlbear.com**, behind
  a login wall so the content is not world-readable even at its URL.
- **localhost** (`npm run dev`) — every post, both audiences plus drafts, so an
  author sees their whole working set.

Every post must declare its audience explicitly — `audience` is a **required**
frontmatter field with **no default**. This is deliberate: defaulting to external
would mean a *forgotten* field silently ships a post to the public site, and that
is exactly the failure we must prevent. A missing audience instead **fails the
build** (and is blocked at authoring time by the guard hook), forcing a conscious
external-vs-internal decision on every post.

The hard requirement is a one-way guarantee: **an internal post must never appear
on the external site.** A leak there is a real disclosure, so the design does not
rely on a single filter — it layers independent safeguards, and the deploy-time
guard inspects the *built artifact*, not just source intent.

### Why this shape

- **Explicit, required marker.** Every post states `audience: external` or
  `audience: internal` — required, no default. A missing or typo'd value fails the
  build (and is blocked at authoring), so a post can never be mis-routed by
  omission. Requiring the field (rather than defaulting to external) closes the
  "forgot to mark it → silently public" hole.
- **One choke point.** Every listing, post page, tag/author page, and the RSS feed
  derive from `getPublishedPosts()`, so the audience filter lives in exactly one
  place and a post excluded there is excluded from every route and the sitemap.
- **Allowlist, never denylist.** The external build keeps *only* posts explicitly
  marked external. A post with a missing/mistyped audience therefore *disappears*
  from the public site instead of leaking onto it — fail-closed by construction.
- **Two hosts, because GitHub Pages can't do it alone.** GitHub Pages serves one
  custom domain per repo and has no auth wall; blog.earlbear.com already owns that
  slot. So the internal site is a separate **Cloudflare Pages** project gated by
  **Cloudflare Access** (Google SSO, `@earlbear.com`) — the same internal-hosting
  pattern the org already uses for `wireframes` / `apps` / `workflow`. DNS, the CF
  Access app, and the deploy dispatch are codified in the sibling `earlbear-domain`
  repo (`domains.yaml` → `deploy: { repo: ../earlbear-blog, cmd: make deploy-internal }`).
- **Distinct look.** The internal build re-tints the accent to teal (a scoped
  semantic-token override, no dark mode, no raw hex) and shows an "internal" chrome
  marker, so there is never doubt which site you are on.

### Safety layers (defense in depth)

1. Allowlist filter with a fail-closed default (`src/lib/posts.ts`).
2. `check-audience.py` — a PostToolUse hook that rejects a bad `audience` value, and
   a **deploy gate** (`--check-dist`) that greps the built `dist/` and aborts the
   deploy if any cross-audience content leaked in. This checks real output, so it
   survives a filter refactor or a mis-set env var.
3. The zod enum in the schema fails the build on any non-enum value.
4. Deploy scripts assert `PUBLIC_AUDIENCE` matches the target before publishing.
5. The internal deploy strips `dist/CNAME` (which names the external host) before
   the Cloudflare push, so the internal artifact can never claim blog.earlbear.com.
6. Cloudflare Access gates the internal *site* — even a known URL is unreadable to
   anyone outside the org.

Layers 1–5 keep internal content out of the external *artifact*; layer 6 keeps the
internal *site* private. The verification (build both audiences, grep `dist/` for
isolation, then deliberately break the filter and confirm the gate fails) is in the
plan at `.claude/plans/quirky-dancing-pretzel.md`.

## Code
<!-- Anchors seeded post-commit via feature-docs / `npm run features:seed`. -->

## Dev build vs prod build — what actually differs

The single most important difference: **`astro dev` shows *every* audience's posts,
regardless of `PUBLIC_AUDIENCE`** — `getPublishedPosts()` returns early with `true`
under `import.meta.env.DEV` ("localhost sees everything"). The audience *filter* only
runs in a real build. So:

| | `astro dev` (localhost) | `npm run build:external` (prod) |
|---|---|---|
| **Posts included** | every audience + drafts (a superset) | only `audience: external`, fail-closed allowlist |
| **Chrome / theme** | reflects `PUBLIC_AUDIENCE` (badge, accent) | matches the target |
| **Audience "teeth"** | not run | `check-audience.py --check-dist` scans `dist/` |
| **Output** | unminified, served live | minified, hashed assets, `CNAME`/`robots` |

Consequences worth knowing:
- A **client-side preview** (the dev-only INTERNAL-badge toggle, see Code) can *hide*
  internal cards and swap the theme, but it can **never** reproduce the real external
  build — that build wouldn't have *built* the internal posts at all, and the
  dist-scan teeth only exist at build time. The toggle is a convenience preview; the
  faithful check is `npm run build:external` + `npm run audience-check`.
- Because dev is a superset, a `dev` pass can look fine while the real external build
  legitimately omits a post (correct) — or, for layout, `vite dev` can pass while the
  production build breaks (the React-dedupe class of bug). Always verify the built
  output for anything load-bearing.

## Notes

- The build target is chosen by `PUBLIC_AUDIENCE` (`external` default | `internal`).
  `npm run build:internal` / `deploy:internal` set it; `astro.config.mjs` reads it
  to pick the canonical `site` origin so RSS/sitemap/canonical URLs match the host.
- **Dev-only external preview:** on localhost the internal nav badge toggles a
  `data-preview="external"` attribute on `<html>` (hides `audience:internal` cards,
  re-tints the accent), persisted in `localStorage`. Guarded by `import.meta.env.DEV`
  so it is tree-shaken from every production build (verified: no toggle button/script
  in `dist/`). A preview, not the real external build (see the table above).
- **Comments are internal-only** (a Figma-style, fragment-anchored comment layer;
  see the gtm repo's `docs/comments-design.md`). This is the blog's first Cloudflare
  Pages Function (`functions/api/auth-token.js`) and first Supabase integration.
  The comment layer (`src/components/CommentLayer.astro` + `supabaseClient.ts` +
  `comments.ts`) is guarded by `import.meta.env.PUBLIC_AUDIENCE === 'internal'` so
  its JS + supabase-js are **tree-shaken from the external bundle**, and its styles
  are `<style is:inline>` so they ship only when the component renders. The external
  (GitHub Pages) build has no server, no CF Access, and RLS denies anon — so comments
  are structurally absent there, not just filtered. `check-audience.py --check-dist`
  fails the deploy if any comment-layer artifact (`data-comment-layer` / `cl-*` /
  `blog_comments` / `@supabase`) leaks into the external `dist/`.
- One-time infra (not in this repo): create the `earlbear-blog-internal` CF Pages
  project, attach `blog.internal.earlbear.com`, and provision the CF Access app via
  `earlbear-domain` (`make cf-access-app-upsert`). The `domains.yaml` record is
  marked `awaiting_deploy` until the first internal deploy ships. For comments, also
  set the CF Pages secrets `SUPABASE_SIGNING_KEY`, `CF_ACCESS_TEAM_DOMAIN`, and the
  **blog's own** `CF_ACCESS_AUDIENCE` (distinct from gtm's) on `earlbear-blog-internal`.
- `src/content/blog/internal-only-example.md` is a fixture proving the split; delete
  it once you have a real internal post.

## Paired posts (external lead + internal `-design` companion)

A recurring shape: a topic ships as **two** posts — an external *"what it does"* lead
(`X.mdx`, `audience: external`) and a detailed internal companion (`X-design.mdx`,
`audience: internal`). The pair is deliberate: the public lead tells the story; the internal
`-design` post holds the mechanism, decisions, and anything that would over-share.
`check-audience-fit.py` is pair-aware — it does **not** nudge an internal post toward external
just for reading polished when it's part of a pair, and it applies *extra* scrutiny to the
external lead (its detail lives hidden internally, so the moat can creep into the public half).
When judging a lead, run the `external-post-review` skill on it specifically; if softening
guts it, the lead itself belongs internal too. See the `audience-audit` skill for the full
reclassification workflow.

## Reclassification log

Notable audience moves (dated), so the rationale is discoverable and old public URLs aren't a
mystery. A public→internal move is the one worth recording — someone may have the old link.

- **2026-07-10 — `ecommerce-site-scanner` → `internal`** (was `external`). The public lead of
  the scanner/lead-engine pair narrated the go-to-market mechanism (how the agent discovers
  stores, finds contacts, scores leads, drafts outreach) — EarlBear's moat, in plain prose.
  Softening it to outcome-only would gut it, so the lead joined its `-design` companion as
  internal. Both halves are now `internal`. This also drove the `external-post-review` skill's
  "business mechanism in plain prose" moat category + the pair-aware audience-fit fix.
