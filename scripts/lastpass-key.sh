#!/usr/bin/env bash
# Back up / restore the dotenvx PRIVATE decryption key (.env.keys) to LastPass as the
# source of truth. Without this, .env.keys lives ONLY on one machine — lose it and the
# `encrypted:` CLOUDFLARE_API_TOKEN in .env (used by `make deploy-internal`) is
# unrecoverable and must be re-minted.
#
# The whole `.env.keys` file content is stored as a LastPass secure-note item, so a fresh
# clone / new machine can `key-restore` it before running any `dotenvx run --`.
#
# Requires: lpass CLI (`brew install lastpass-cli`) and an active session (`lpass login <email>`).
# This script NEVER prints the key; it pipes it directly between the file and lpass.
#
# Mirrors ../earlbear-domain/scripts/lastpass-key.sh (per-repo item name).
set -uo pipefail

ITEM="${LPASS_KEY_ITEM:-earlbear/earlbear-blog/DOTENV_PRIVATE_KEY}"   # LastPass item name
KEYFILE="${DOTENV_KEYS_FILE:-.env.keys}"

die() { printf '  [FAIL] %s\n' "$1" >&2; exit 1; }

need_lpass() {
  command -v lpass >/dev/null 2>&1 || die "lpass CLI not installed — brew install lastpass-cli"
  if ! lpass status >/dev/null 2>&1; then
    die "not logged in to LastPass — run:  lpass login <your-email>   (interactive; MFA if enabled)"
  fi
}

case "${1:-}" in
  backup)
    need_lpass
    [ -f "$KEYFILE" ] || die "$KEYFILE not found — nothing to back up (run 'npx dotenvx set ...' first)"
    if lpass show "$ITEM" >/dev/null 2>&1; then
      lpass edit --non-interactive --notes "$ITEM" < "$KEYFILE" \
        && printf '  [OK] updated LastPass item "%s" from %s\n' "$ITEM" "$KEYFILE" \
        || die "lpass edit failed"
    else
      printf 'Notes: %s\n' "$(cat "$KEYFILE")" | lpass add --non-interactive --notes "$ITEM" \
        && printf '  [OK] created LastPass item "%s" from %s\n' "$ITEM" "$KEYFILE" \
        || die "lpass add failed"
    fi
    lpass sync >/dev/null 2>&1 || true
    ;;
  restore)
    need_lpass
    lpass show "$ITEM" >/dev/null 2>&1 || die "LastPass item \"$ITEM\" not found — was it backed up? (make key-backup)"
    if [ -f "$KEYFILE" ]; then
      printf '  [note] %s already exists; overwriting with the LastPass copy.\n' "$KEYFILE" >&2
    fi
    lpass show --notes "$ITEM" > "$KEYFILE" || die "lpass show failed"
    chmod 600 "$KEYFILE"
    if grep -q '^DOTENV_PRIVATE_KEY' "$KEYFILE"; then
      printf '  [OK] restored %s from LastPass item "%s"\n' "$KEYFILE" "$ITEM"
    else
      die "restored file does not contain DOTENV_PRIVATE_KEY — check the LastPass item content"
    fi
    ;;
  status)
    command -v lpass >/dev/null 2>&1 || die "lpass CLI not installed"
    lpass status 2>&1 | sed 's/^/  lpass: /'
    if lpass status >/dev/null 2>&1; then
      if lpass show "$ITEM" >/dev/null 2>&1; then
        printf '  backup: item "%s" EXISTS in LastPass\n' "$ITEM"
      else
        printf '  backup: item "%s" NOT found — run make key-backup\n' "$ITEM"
      fi
    fi
    [ -f "$KEYFILE" ] && printf '  local: %s present\n' "$KEYFILE" || printf '  local: %s MISSING — run make key-restore\n' "$KEYFILE"
    ;;
  *)
    echo "usage: lastpass-key.sh {backup|restore|status}" >&2; exit 2;;
esac
