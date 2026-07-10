---
name: wire-supabase-feature
description: Add a Cloudflare-Access-gated, RLS-identity, optionally-realtime Supabase feature to the internal blog (or another CF-Pages EarlBear app) the proven way. Use when a feature needs to read/write Supabase as the logged-in @earlbear.com user — comments, reactions, a saved-view, any per-user data on an internal, access-gated page. Codifies the token-exchange + identity-RLS + external-exclusion pattern the comment layer established, so the next such feature doesn't re-derive it.
---

# Wire a Supabase-backed feature into the internal blog

The blog is a static Astro site behind Cloudflare Access. To let a feature read/write
Supabase **as the verified `@earlbear.com` user** — with the database (not just the edge)
enforcing identity, and Realtime intact — follow the pattern the comment layer proved
(`src/components/CommentLayer.astro`, `docs/comments-design.md` in the gtm repo). Do NOT
invent a new auth path.

## The pattern in one picture

```
CF Access (Google SSO, @earlbear.com)  ── gates the page
        │  the browser fetches:
        ▼
  GET /api/auth-token  (functions/api/auth-token.js — a thin wrapper over
        │               @earlbear/cf-supabase-auth's handleAuthTokenRequest)
        │  verifies the CF Access JWT → asserts @earlbear.com → mints a 30-min
        │  ES256 Supabase JWT (role:authenticated, email claim)
        ▼
  supabase-js createClient(url, publishableKey, { accessToken })
        │  the minted JWT rides REST *and* Realtime
        ▼
  RLS: `using ((auth.jwt()->>'email') like '%@earlbear.com')`  + author pinned by
       `with check (author_col = (auth.jwt()->>'email'))`
```

## Steps

1. **Auth — reuse, don't rebuild.** `/api/auth-token` already exists
   (`functions/api/auth-token.js`, the shared `@earlbear/cf-supabase-auth` package). If
   your feature is on the internal blog, the token path is done. The client singleton is
   `src/data/supabaseClient.ts` (`getSupabase()` + the cached `accessToken` callback) —
   import it; don't make a second client.

2. **Schema — portable table + `_prod` RLS** (the repo's dual-mode convention; migrations
   live in `earlbear-clis/transcripts-cli/migrations/`). Mirror `015_blog_comments`:
   - `NNN_x.sql` — pure portable DDL (table + indexes), no `anon`/`authenticated`/`auth.*`.
   - `NNN_x_prod.sql` — `enable row level security`; a read policy
     `for select to authenticated using (((select auth.jwt())->>'email') like '%@earlbear.com')`;
     an insert policy that **pins the author** `with check (author_col = ((select auth.jwt())->>'email'))`
     (no spoofing); column-locked grants; no anon policy; if live, add the table to
     `supabase_realtime` + `replica identity full`. Use `(select auth.jwt())` for the
     initplan optimization.
   - Apply to Supabase via the MCP `apply_migration` (needs the user's go-ahead — prod).
     Schema first, then any client that inserts (the ordering hazard).

3. **Data/UI — a vanilla module + one component under `internal &&`.** Put the
   CRUD/realtime logic in `src/data/<feature>.ts` (importable, unit-testable). Render the
   UI from one component included once in `BaseLayout` behind `{internal && <X />}`
   (the `DiagramFullscreen`/`CommentLayer` shape). No framework — vanilla + an inline
   or hoisted `<script>`.

4. **External-exclusion — non-negotiable, and TEST it.** The public build must ship none
   of this:
   - Guard the client script's body with `if (import.meta.env.PUBLIC_AUDIENCE === 'internal') { … }`
     so Vite tree-shakes the impl **and supabase-js** out of the external bundle.
   - Emit component styles as `<style is:inline>` (not `<style is:global>`), which ships
     only when the component renders — an `is:global` block bundles unconditionally and
     leaks.
   - Add the feature's markers to `check-audience.py`'s `--check-dist` comment-layer scan
     (or an equivalent) so a leak fails the deploy. Verify: `build:external` then grep
     `dist/` for your markers + `@supabase` → must be zero.

5. **Prove it, POC-gated.** RLS claims (outsider reads nothing, spoof rejected, anon
   denied) prove **live** via the MCP `execute_sql` / a real minted-token REST round-trip
   (see `docs/poc-comments.md`). DOM/UI claims prove in the blog's Playwright suite
   (`tests/`) — and include a test that exercises the **full component init** (not just
   exposed pure helpers), or a temporal-dead-zone / init bug will slip through.

## Gotchas (learned the hard way)

- The internal blog is a **different CF Access app** than gtm → its `CF_ACCESS_AUDIENCE`
  secret is distinct; a wrong value denies every token mint (403).
- **Local dev** needs the Astro dev-mint integration (`integrations/dev-auth-token.ts`)
  and a local `.signing-key.jwk.json` (gitignored) — `astro dev` then serves
  `/api/auth-token`.
- Render any **user-supplied text as `textContent`**, never `set:html` (stored-XSS).
- Wire interactive handlers **before** the async identity/data load, and declare all
  `let` state **before** the functions that close over it (a TDZ ReferenceError there
  fails silently — the layer "initializes" but nothing works).
- Realtime: subscription success ≠ row delivery; RLS still gates delivered events.

## Related

Design + POC: `docs/comments-design.md`, `docs/poc-comments.md` (gtm repo). Auth model:
the `security-posture` skill (owns the CF-Access→JWT trust model). Portable SQL: the
`portable-sql` skill (the table/`_prod` split + the apply-before-push ordering hazard).
Audience safety: `docs/features/audience-split.md`.
