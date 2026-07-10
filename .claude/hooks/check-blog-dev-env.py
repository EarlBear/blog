#!/usr/bin/env python3
"""Nudge (never block) when a blog dev server is launched in a way that silently breaks the
comment layer.

Two footguns, both of which fail with NO error until the comment layer tries to initialize:

  1. Running `astro dev` WITHOUT `dotenvx run --`. `.env` holds dotenvx CIPHERTEXT
     (PUBLIC_SUPABASE_URL="encrypted:…"); bare `astro dev` inlines that ciphertext verbatim, so
     supabase-js throws `Invalid supabaseUrl` at createClient and the layer never loads. The fix
     is to decrypt via dotenvx first.
  2. Running the dev server intending the INTERNAL site but WITHOUT `PUBLIC_AUDIENCE=internal`.
     Astro then compiles the internal audience out — the comment layer is tree-shaken and pressing
     C does nothing.

The blessed command is `make dev-internal` (external preview is `make dev`). This hook is a
PreToolUse matcher on Bash: if a command LOOKS like a hand-rolled blog dev-server launch that is
missing dotenvx, it prints a one-line reminder to stderr and exits 2 (advisory — Claude sees it,
the command still runs). It NEVER blocks, because bare `astro dev` for the EXTERNAL/public preview
is legitimate (that build reads no secrets). It only fires on the internal-intent / ciphertext-risk
shape, so it doesn't nag the external path.

Contract mirrors the other check-*.py: PreToolUse JSON on stdin. Exit 0 = nothing to say.
"""
import json
import re
import sys

# A command that starts an Astro dev/preview server (npm run dev, astro dev, npx astro dev,
# astro preview). We only care about the blog's local server here.
DEV_LAUNCH_RE = re.compile(r"\b(astro\s+(dev|preview)|npm\s+run\s+(dev|preview)\b)")
# Already going through dotenvx → decrypted → safe. (dotenvx run / dotenvx.bin / make dev-internal
# which itself wraps dotenvx.)
HAS_DOTENVX_RE = re.compile(r"\bdotenvx\b")
# The blessed make targets already do the right thing — don't second-guess them.
BLESSED_RE = re.compile(r"\bmake\s+dev-internal\b|\bmake\s+dev\b")
# Signals the user INTENDS the internal site (comment layer) — where the failure actually bites.
INTERNAL_INTENT_RE = re.compile(r"PUBLIC_AUDIENCE\s*=\s*internal")


def advice(command: str) -> str | None:
    """Return a nudge string if this command is a risky blog dev launch, else None."""
    if not DEV_LAUNCH_RE.search(command):
        return None
    if BLESSED_RE.search(command):
        return None  # `make dev` / `make dev-internal` already handle audience + dotenvx
    if HAS_DOTENVX_RE.search(command):
        return None  # already decrypting via dotenvx

    if not INTERNAL_INTENT_RE.search(command):
        # Bare dev with no audience set = the EXTERNAL/public preview. That is CORRECT and common
        # (the external build reads no secrets and needs no key), so stay silent — nagging every
        # `make dev` / `npm run dev` would just train the reader to ignore this hook.
        return None
    # The exact break we keep hitting: internal audience intended, but bare env → dotenvx ciphertext
    # leaks into createClient → `Invalid supabaseUrl`, comment layer dead with no other error.
    return (
        "This launches the INTERNAL blog dev server (PUBLIC_AUDIENCE=internal) but WITHOUT dotenvx, "
        "so .env stays ENCRYPTED and `PUBLIC_SUPABASE_URL=\"encrypted:…\"` reaches supabase-js → "
        "`Invalid supabaseUrl` and the comment layer never loads. Use `make dev-internal` (it wraps "
        "`dotenvx run -- astro dev` + PUBLIC_AUDIENCE=internal). See the run-blog-locally skill."
    )


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0
    if payload.get("tool_name") != "Bash":
        return 0
    command = str((payload.get("tool_input", {}) or {}).get("command", "") or "")
    msg = advice(command)
    if not msg:
        return 0
    # Advisory: surface to Claude (exit 2 so it's seen) but NEVER block — the command still runs.
    sys.stderr.write("blog-dev-env: " + msg + "\n")
    return 2


if __name__ == "__main__":
    sys.exit(main())
