# Credentials companion — every secret/key a Supabase-backed feature needs

Companion to the `wire-supabase-feature` skill. The skill's `SKILL.md` explains the
*pattern*; this file is the **per-credential reference**: what each value is, where it comes
from (with the exact command or dashboard URL), whether it's actually secret, and how to set
it the house way. `.env.example` points here so the deep how-to lives once.

The house flow for any of these (paste → encrypt → back up the private key):

```
make collect-secret VARS="NAME1 NAME2"   # seed placeholders in .env (gitignored), opens it
# paste each real value next to NAME=
make encrypt                             # plaintext → dotenvx `encrypted:` ciphertext
make key-backup                          # back .env.keys up to LastPass (survives a fresh clone)
```

Guardrails that back this up: `.githooks/pre-commit` runs gitleaks **and**
`check-env-encrypted.py` (a tracked `.env*` with any plaintext value fails the commit);
`.gitignore` globs `.env*`, `.env.*.keys`, `.signing-key*.json`.

---

## The credentials

### `PUBLIC_SUPABASE_URL` — publishable, not secret

- **What:** the project's REST/Realtime base URL, `https://<ref>.supabase.co`.
- **Generate / find it:**
  - CLI/MCP: Supabase MCP `get_project_url` (project `ldvaleamtfocaueqebvy`), or
  - Dashboard: <https://supabase.com/dashboard/project/ldvaleamtfocaueqebvy/settings/api> → *Project URL*.
- **Secret?** No — it's in every client bundle. `PUBLIC_` so Astro inlines it at build.
- **Set:** in `.env` (encrypted only to match convention). Same value gtm uses.

### `PUBLIC_SUPABASE_ANON_KEY` — publishable, not secret

- **What:** the anon/publishable key that forms the base `apikey` header. Identity is NOT
  this key — the minted `@earlbear.com` JWT (the `accessToken` callback) carries identity;
  RLS is the enforcer. So this key reads **nothing** on its own against an RLS'd table.
- **Generate / find it:**
  - CLI/MCP: Supabase MCP `get_publishable_keys` (project `ldvaleamtfocaueqebvy`) → use the
    legacy **`anon`** JWT (what gtm's client uses) or an `sb_publishable_…` key.
  - Dashboard: <https://supabase.com/dashboard/project/ldvaleamtfocaueqebvy/settings/api> →
    *Project API keys* → `anon` `public`.
- **Secret?** No (publishable by design). `PUBLIC_`, internal build only.
- **Set:** in `.env`. gtm and the blog share the same project + key.

### `SUPABASE_SIGNING_KEY` / `.signing-key.jwk.json` — SECRET (ES256 private JWK)

- **What:** the EC P-256 **private** key that signs the minted Supabase JWT in the token
  exchange. This is the one true secret in the pattern — it lets the Function vouch identity.
- **Generate it (mint/rotate a fresh one):** gtm owns the minter —
  `make -C ../earlbear-agentic-workflow import-signing-key` (needs `SUPABASE_ACCESS_TOKEN`;
  imports+rotates the key into the Supabase project's JWT signing keys, no dashboard). There
  is **one shared key** for the earlbear apps; don't mint a second unless rotating.
- **Local dev:** the Astro dev-mint (`integrations/dev-auth-token.ts`) reads
  `.signing-key.jwk.json`. Point it at the shared key:
  `ln -s ../earlbear-agentic-workflow/.signing-key.jwk.json .signing-key.jwk.json`
  (gitignored via `.signing-key*.json`; check with `make signing-key-status`). No key →
  local `/api/auth-token` returns 401 and the feature stays inert (secure default).
- **Prod (CF Pages Function):** set as a **wrangler pages secret** on the internal project,
  NOT in `.env`:
  `wrangler pages secret put SUPABASE_SIGNING_KEY --project-name earlbear-blog-internal`
  (paste the JWK JSON). Rotating the key requires re-setting this secret.
- **Secret?** **Yes — never commit, never expose to the client, never put in `.env` for a
  browser build.** It only ever lives in the Function's server-side env / the operator laptop.

### `CF_ACCESS_TEAM_DOMAIN` — config, low-sensitivity

- **What:** the Cloudflare Access team domain (`<team>.cloudflareaccess.com`) whose JWKS the
  Function fetches to verify the CF Access JWT.
- **Find it:** Cloudflare Zero Trust dashboard → *Settings* → *Custom Pages* / team domain,
  or <https://one.dash.cloudflare.com/> → your team's URL.
- **Set (prod):** `wrangler pages secret put CF_ACCESS_TEAM_DOMAIN --project-name earlbear-blog-internal`.

### `CF_ACCESS_AUDIENCE` (AUD) — config, MUST be the blog app's own

- **What:** the Application Audience (AUD) tag of the CF Access application protecting the
  **internal blog**. The Function checks the CF Access JWT's `aud` against this.
- **⚠️ Gotcha:** the internal blog is a **different** CF Access app than gtm, so it has its
  **own** AUD. Using gtm's value = **403 on every token mint**. Get the blog app's AUD.
- **Find it:** Cloudflare Zero Trust → *Access* → *Applications* → the internal-blog app →
  *Overview* → *Application Audience (AUD) Tag*.
- **Set (prod):** `wrangler pages secret put CF_ACCESS_AUDIENCE --project-name earlbear-blog-internal`.

### `CLOUDFLARE_API_TOKEN` — SECRET (scoped deploy token)

- **What:** the token `make deploy-internal` uses to `wrangler pages deploy` the internal
  build. Not part of the runtime auth path — deploy-time only.
- **Generate it:** <https://dash.cloudflare.com/profile/api-tokens> → *Create Token* →
  scope **Account → Cloudflare Pages → Edit** on the earlbear account (least privilege).
- **Secret?** Yes. Stored dotenvx-**encrypted** in `.env`, injected via `dotenvx run --`
  (the auth model the earlbear-domain deploy-contract audit requires — not machine OAuth).

---

## Where each lives (the three homes)

| Credential | `.env` (encrypted) | CF Pages secret | Local file |
|---|:---:|:---:|:---:|
| `PUBLIC_SUPABASE_URL` | ✅ | (build env) | — |
| `PUBLIC_SUPABASE_ANON_KEY` | ✅ | (build env) | — |
| `SUPABASE_SIGNING_KEY` | ❌ never | ✅ | `.signing-key.jwk.json` (dev, gitignored) |
| `CF_ACCESS_TEAM_DOMAIN` | — | ✅ | — |
| `CF_ACCESS_AUDIENCE` | — | ✅ | — |
| `CLOUDFLARE_API_TOKEN` | ✅ | — | — |

The rule that makes this safe: **the client only ever gets publishable values; the signing
key never leaves the server/operator laptop; RLS — not any key — is the enforcer.**
