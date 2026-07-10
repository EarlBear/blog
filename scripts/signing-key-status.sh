#!/usr/bin/env bash
# Report the state of the LOCAL ES256 signing key the comment layer's dev token-mint needs
# (integrations/dev-auth-token.ts reads .signing-key.jwk.json). This is a READ-ONLY status
# report — it NEVER prints the key material, only its presence/shape/provenance.
#
# The blog does not own a signing key. There is ONE shared key for the earlbear apps, minted
# by gtm (`make -C ../earlbear-agentic-workflow import-signing-key`). Locally the blog points
# at it via a symlink so dev `/api/auth-token` can mint a valid @earlbear.com identity:
#   ln -s ../earlbear-agentic-workflow/.signing-key.jwk.json .signing-key.jwk.json
# Prod does NOT use this file — there the key is a wrangler pages secret (SUPABASE_SIGNING_KEY).
# See .claude/skills/wire-supabase-feature/credentials.md.
set -uo pipefail

KEYFILE="${SUPABASE_SIGNING_KEYFILE:-.signing-key.jwk.json}"
SHARED="../earlbear-agentic-workflow/.signing-key.jwk.json"

ok()   { printf '  \033[32m[OK]\033[0m   %s\n' "$1"; }
warn() { printf '  \033[33m[warn]\033[0m %s\n' "$1"; }
info() { printf '  \033[36m[info]\033[0m %s\n' "$1"; }

printf 'Signing key (local dev token-mint) — %s\n' "$KEYFILE"

# 1. Present?
if [ ! -e "$KEYFILE" ]; then
  warn "not present — local /api/auth-token will 401 and the comment layer stays inert."
  info "fix: ln -s $SHARED $KEYFILE   (the shared gtm key)"
  info "or, if gtm's key is absent too: make -C ../earlbear-agentic-workflow import-signing-key"
  exit 0
fi

# 2. Symlink to the shared key, or a standalone file?
if [ -L "$KEYFILE" ]; then
  target="$(readlink "$KEYFILE")"
  if [ "$target" = "$SHARED" ]; then
    ok "symlink → $target (the shared gtm key — single source of truth)"
  else
    warn "symlink → $target (NOT the expected shared key $SHARED)"
  fi
  if [ -r "$KEYFILE" ]; then ok "target readable"; else warn "target NOT readable — is gtm's key present?"; fi
else
  warn "standalone file (not the shared symlink). A per-repo copy drifts from gtm's key."
  info "prefer: rm $KEYFILE && ln -s $SHARED $KEYFILE"
fi

# 3. Shape sanity (EC P-256 private JWK) — presence of fields only, never the values.
if [ -r "$KEYFILE" ] && command -v python3 >/dev/null 2>&1; then
  python3 - "$KEYFILE" <<'PY' || warn "could not parse as JWK JSON"
import json, sys
d = json.load(open(sys.argv[1]))
kty, crv, hasd = d.get("kty"), d.get("crv"), ("d" in d)
kid = d.get("kid", "(none)")
if kty == "EC" and crv == "P-256" and hasd:
    print(f"  \033[32m[OK]\033[0m   EC P-256 private JWK (kid {kid})")
else:
    print(f"  \033[33m[warn]\033[0m unexpected JWK: kty={kty} crv={crv} private={hasd}")
PY
fi

# 4. Gitignored? (must never be committed)
if git check-ignore "$KEYFILE" >/dev/null 2>&1; then
  ok "gitignored — will not be committed"
else
  warn "NOT gitignored — add .signing-key*.json to .gitignore before committing anything"
fi
