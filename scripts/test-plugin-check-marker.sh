#!/usr/bin/env bash
# Checks the plugin-check hook in .claude/settings.json (the one that runs check-plugins.sh).
#
# The hook runs the plugin check once per session and leaves a marker file so it does not run
# again. The marker was renamed; sessions that started before the rename left the old one, so
# the hook must skip when either marker is there. This test runs the hook's own command line,
# with the marker folder moved to a scratch folder and the plugin check swapped for a stub:
#   1. no marker:          the check runs, and the new marker is written;
#   2. new marker only:    the check is skipped;
#   3. old marker only:    the check is skipped, and no new marker is written.
#
# The cases run under sh, bash and zsh (each one installed), since the shell that runs a hook
# is not fixed. Both marker names are read from the hook line itself, so this test never goes stale.
# The real /tmp markers are never touched.
#
#   make plugin-marker-test
#   bash scripts/test-plugin-check-marker.sh [path/to/settings.json]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SETTINGS="${1:-$ROOT/.claude/settings.json}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# Line 1: the hook command with /tmp/ moved to $WORK and the check swapped for a stub.
# Lines 2 and 3: the new and the old marker base names.
PARSED="$(python3 - "$SETTINGS" "$WORK" <<'PY'
import json, re, sys
settings, work = sys.argv[1], sys.argv[2]
hooks = json.load(open(settings))["hooks"]
# Look under every hook event, so moving the hook to another event does not hide it from the test.
cmds = [h["command"] for entries in hooks.values() for entry in entries for h in entry["hooks"]
        if "check-plugins.sh" in h.get("command", "")]
assert len(cmds) == 1, f"expected one plugin-check hook, found {len(cmds)}"
cmd = cmds[0]
new = re.search(r"(?<![A-Z_])MARKER=/tmp/([^;]+)-\$\{PPID\}", cmd)
old = re.search(r"OLD_MARKER=/tmp/([^;]+)-\$\{PPID\}", cmd)
assert new and old, "hook line has no MARKER / OLD_MARKER pair"
assert new.group(1) != old.group(1), "new and old marker names are the same"
# Only the two marker paths may move, so no other part of the line is changed by the test.
assert cmd.count("/tmp/") == 2, "hook line has a /tmp/ path besides the two markers"
cmd = cmd.replace("/tmp/", work + "/")
# The plugin check must be the last step, so swapping it out drops nothing else from the line.
cmd, n = re.subn(r"bash \S*/check-plugins\.sh[^;&|]*$", f"touch {work}/check-ran", cmd)
assert n == 1, "could not swap the plugin check for a stub (is it still the last step?)"
print(cmd)
print(new.group(1))
print(old.group(1))
PY
)"
CMD="$(sed -n 1p <<<"$PARSED")"
NEW="$WORK/$(sed -n 2p <<<"$PARSED")-$$"
OLD="$WORK/$(sed -n 3p <<<"$PARSED")-$$"

fails=0
pass() { echo "  ok    $1"; }
fail() { echo "  FAIL  $1"; fails=$((fails + 1)); }
reset() { rm -f "$WORK"/*; }
# Run directly (no subshell), so ${PPID} inside the hook is this script's $$.
run_hook() { "$1" -c "$CMD"; }

echo "plugin-check marker:"

shells=0
for sh in sh bash zsh; do
  command -v "$sh" >/dev/null 2>&1 || { echo "  skip  $sh: not installed"; continue; }
  shells=$((shells + 1))

  reset
  run_hook "$sh"
  [ -f "$WORK/check-ran" ] && pass "$sh, no marker: the check runs" || fail "$sh, no marker: the check did not run"
  [ -f "$NEW" ] && pass "$sh, no marker: the new marker is written" || fail "$sh, no marker: the new marker was not written"

  reset
  touch "$NEW"
  run_hook "$sh"
  [ ! -f "$WORK/check-ran" ] && pass "$sh, new marker: the check is skipped" || fail "$sh, new marker: the check ran again"

  reset
  touch "$OLD"
  run_hook "$sh"
  [ ! -f "$WORK/check-ran" ] && pass "$sh, old marker: the check is skipped" || fail "$sh, old marker: the check ran again"
  [ ! -f "$NEW" ] && pass "$sh, old marker: no new marker is written" || fail "$sh, old marker: a new marker was written"
done
[ "$shells" -gt 0 ] || fail "no shell found to run the hook"

if [ "$fails" -ne 0 ]; then
  echo "plugin-check marker: $fails failure(s)"
  exit 1
fi
echo "plugin-check marker: all passed"
