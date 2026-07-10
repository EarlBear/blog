---
name: run-blog-locally
description: Run the EarlBear blog locally — external (public) vs internal (comment layer) audience, and why the internal run needs dotenvx + PUBLIC_AUDIENCE=internal or the comment layer silently fails.
---

# Run the blog locally

The blog is one Astro repo that builds **two audiences** selected by `PUBLIC_AUDIENCE`:

- **external** — the public site (`blog.earlbear.com`, GitHub Pages). No server, no database,
  no comment layer, no CF-Access-gated content. Reads **no secrets**.
- **internal** — the team site (`blog.internal.earlbear.com`, Cloudflare Pages behind CF
  Access). Ships the **Figma-style comment layer** (Supabase-backed, RLS-gated to
  `@earlbear.com`). Reads the Supabase URL + publishable key from the dotenvx-encrypted `.env`.

Both serve at `http://localhost:4343`.

## The one decision: which audience are you previewing?

| You want to… | Run | Serves |
|---|---|---|
| Preview the **public** site (what ships to the world) | `make dev` | `data-audience=external`, no comments |
| Work on the **comment layer** / internal-only content | `make dev-internal` | `data-audience=internal`, comments live |

**If you press `C` and nothing happens, you are almost certainly on `make dev` (external).**
The comment layer is tree-shaken out of the external build by design — that's the structural
guarantee that the public site can never carry comments. Switch to `make dev-internal`.

## Why `make dev-internal` is not just `astro dev`

Running the internal site by hand (`PUBLIC_AUDIENCE=internal astro dev`) fails in **two silent
ways** — no error until the comment layer tries to initialize. `make dev-internal` gets both
right; prefer it over a hand-rolled command.

1. **`PUBLIC_AUDIENCE=internal` must be set.** `import.meta.env.PUBLIC_AUDIENCE` is inlined at
   build time. Without it, Astro compiles the internal audience OUT: the comment layer's whole
   `<script>` is tree-shaken, `data-audience` is `external`, and `C` does nothing. Looks like a
   bug in the comment layer; it's just the wrong audience.

2. **It must run through `dotenvx run --`.** `.env` holds **dotenvx ciphertext**
   (`PUBLIC_SUPABASE_URL="encrypted:…"`). Bare `astro dev` reads `.env` as raw text via Vite's
   built-in dotenv and inlines the **ciphertext verbatim** — so `createClient` receives
   `"encrypted:…"` as its URL and throws `Invalid supabaseUrl: Must be a valid HTTP or HTTPS
   URL.` The layer never initializes. `dotenvx run` DECRYPTS `.env` first (needs `.env.keys`,
   which is gitignored and machine-local), so the real `https://…` URL + publishable key reach
   the build. This is exactly the failure mode from the `check-blog-dev-env` warn-hook and the
   [[local-supabase-auth-model]] memory.

The blessed command (what `make dev-internal` runs):

```bash
PUBLIC_AUDIENCE=internal ./node_modules/.bin/dotenvx run --quiet -- npx astro dev --port 4343
```

## How local login works (the mental model)

There are **two independent gates**, and localhost only removes one:

1. **CF Access** — the Google-SSO *login screen*, in front of the deployed internal site only.
   Locally there is no screen to bypass; the page just loads.
2. **Supabase RLS** — the *real data gate*, enforced in the cloud on every request. It admits
   only a request carrying a valid `@earlbear.com` **minted JWT**. No token → reads nothing (the
   secure empty default).

**Minting that token does NOT need CF Access.** The dev-only `dev-auth-token` Astro integration
(`integrations/dev-auth-token.ts`, registered only via `astro:server:setup`, so it can never
exist in a deployed build) mints the same ES256 token the prod Function would — from the
operator's **local signing key** — for a default identity `dev@earlbear.com` (override with
`EB_DEV_LOGIN_EMAIL`). So `make dev-internal` auto-logs-you-in as a genuine `@earlbear.com`
identity; nothing is weakened.

- **Have the signing key** (`.signing-key.jwk.json` or `SUPABASE_SIGNING_KEY`) → comments load,
  read, and write against the live table. Check with `make signing-key-status`.
- **No signing key** → the layer still loads (URL/key are valid) but `/api/auth-token` returns
  401, so it reads nothing — the correct secure default, same as prod with no CF Access.

Local comments carry `env='local'` (a separate pool from the deployed internal site's
`env='internal'`), so scratch comments never pollute the real review thread.

## Quick checklist when comments "don't work" locally

Run these in order — each rules out one failure mode:

1. `curl -s localhost:4343/blog/<slug>/ | grep -o 'data-audience="[^"]*"'`
   → must be `internal`. If `external`, you're on `make dev` — use `make dev-internal`.
2. `curl -s 'localhost:4343/src/data/supabaseClient.ts' | grep -o 'PUBLIC_SUPABASE_URL[^,]*'`
   → must show `https://…`, NOT `encrypted:…`. If ciphertext, the server wasn't started through
   dotenvx — restart with `make dev-internal`.
3. Browser console: `Invalid supabaseUrl` → same as (2). `blocked … disallowed MIME type` on a
   `@supabase_supabase-js.js?v=<hash>` module → stale Vite dep cache; `rm -rf node_modules/.vite`
   and restart.
4. `make signing-key-status` → no key means comments load but read nothing (expected; not a bug).

## Notes

- `make dev` (external) is safe to run anywhere — it reads no secrets and needs no key.
- Never ship a build made with bare `astro dev`'s env — the dotenvx guard (`check-env-encrypted`)
  and the `check-blog-dev-env` warn-hook exist to catch the ciphertext-leak path.
- Related: [[local-supabase-auth-model]] (the two-gates model), the `wire-supabase-feature` skill
  (adding a new RLS-gated feature), `docs/comments-design.md` (the comment layer itself).
