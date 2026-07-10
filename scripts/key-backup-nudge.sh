#!/usr/bin/env sh
# Advisory nudge printed after `make encrypt`: encrypting a new/changed secret means the
# dotenvx PRIVATE key (.env.keys) is what now decrypts it. LastPass is that key's ONLY backup
# — lose it with no backup and every `encrypted:` value in .env is unrecoverable. This just
# reminds; it NEVER blocks and never prints key material. Skip with EB_NO_BACKUP_NUDGE=1.
set -u

KEYFILE="${DOTENV_KEYS_FILE:-.env.keys}"

# Nothing to back up (no private key on this machine) — say so quietly and stop.
[ -f "$KEYFILE" ] || { printf '  \033[36m[info]\033[0m no %s yet — nothing to back up.\n' "$KEYFILE"; exit 0; }

# If lpass is available and logged in, check whether the backup item already exists so the
# nudge is accurate ("backed up ✓" vs "not backed up — do it"). If lpass is absent/logged out
# we can't know, so nudge unconditionally (the safe default).
ITEM="${LPASS_KEY_ITEM:-earlbear/earlbear-blog/DOTENV_PRIVATE_KEY}"
if command -v lpass >/dev/null 2>&1 && lpass status >/dev/null 2>&1; then
  if lpass show "$ITEM" >/dev/null 2>&1; then
    printf '  \033[33m[nudge]\033[0m secret changed — re-run \033[1mmake key-backup\033[0m to update the LastPass copy of %s.\n' "$KEYFILE"
  else
    printf '  \033[33m[nudge]\033[0m %s is NOT backed up — run \033[1mmake key-backup\033[0m (LastPass is its only backup).\n' "$KEYFILE"
  fi
else
  printf '  \033[33m[nudge]\033[0m remember to \033[1mmake key-backup\033[0m so %s survives a fresh clone (LastPass = source of truth).\n' "$KEYFILE"
fi
exit 0
