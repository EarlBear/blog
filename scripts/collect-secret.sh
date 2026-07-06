#!/usr/bin/env bash
# collect-secret.sh VAR [VAR2 ...]
#
# Interactive-friendly secret collection for this repo's dotenvx-encrypted .env:
#   1. Ensure .env exists (seed from .env.example if missing) and is gitignored.
#   2. For each VAR not already present, append a placeholder line `VAR=` with a
#      comment marker so you know what to fill in.
#   3. Open .env in VS Code (if `code` is available) so you can paste the values.
#   4. Print the next step: `make encrypt` (dotenvx encrypts in place → ciphertext,
#      safe to commit; plaintext never stays on disk once encrypted).
#
# Nothing here prints or transmits a secret. Placeholder-only until you paste + encrypt.
set -uo pipefail

[ $# -ge 1 ] || { echo "Usage: collect-secret.sh VAR [VAR2 ...]" >&2; exit 2; }

ENV=".env"
EXAMPLE=".env.example"

# 1. Ensure .env exists.
if [ ! -f "$ENV" ]; then
  if [ -f "$EXAMPLE" ]; then
    cp "$EXAMPLE" "$ENV"
    echo "  created $ENV from $EXAMPLE"
  else
    : > "$ENV"
    echo "  created empty $ENV"
  fi
fi

# 2. Confirm .env is gitignored (never let a plaintext secret be committable).
if git check-ignore "$ENV" >/dev/null 2>&1; then
  echo "  ✓ $ENV is gitignored (safe)"
else
  echo "  ⚠ $ENV is NOT gitignored — adding it to .gitignore before proceeding."
  printf '\n# secrets — never commit plaintext\n.env\n.env.*\n!.env.example\n' >> .gitignore
fi

# 3. Add a placeholder line for each requested var that isn't already set.
added=0
for var in "$@"; do
  if grep -q "^${var}=" "$ENV" 2>/dev/null; then
    # Already present. If it looks encrypted, note it; else leave for editing.
    if grep -q "^${var}=encrypted:" "$ENV"; then
      echo "  • $var already set (encrypted) — skipping placeholder"
    else
      echo "  • $var present (plaintext/blank) — fill it in, then encrypt"
    fi
  else
    printf '\n# TODO: paste the value, then run `make encrypt`\n%s=\n' "$var" >> "$ENV"
    echo "  + added placeholder: $var="
    added=$((added + 1))
  fi
done

# 4. Open in VS Code for editing (graceful if `code` isn't on PATH).
echo ""
if command -v code >/dev/null 2>&1; then
  code "$ENV" 2>/dev/null && echo "  opened $ENV in VS Code — paste the value(s) next to each VAR=" \
    || echo "  (couldn't launch VS Code; edit $ENV manually)"
else
  echo "  VS Code CLI ('code') not found — edit $ENV in your editor:"
  echo "    \$EDITOR $ENV   (or open it however you like)"
fi

echo ""
echo "  NEXT:"
echo "    1. Paste each secret value after its VAR= in $ENV (no quotes needed)."
echo "    2. Encrypt in place (plaintext → dotenvx ciphertext, safe to commit):"
echo "         make encrypt"
echo "    3. Verify it's ciphertext:  grep '^VAR=encrypted:' $ENV"
if [ "$added" -eq 0 ]; then
  echo "  (No new placeholders added — the requested vars already exist.)"
fi
exit 0
