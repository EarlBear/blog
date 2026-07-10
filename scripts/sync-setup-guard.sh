#!/usr/bin/env sh
# sync-setup-guard — roll the SessionStart repo-setup-guard out to the other earlbear repos.
#
# The guard (.githooks/repo-setup-guard.sh) auto-wires core.hooksPath + warns on missing
# gitleaks/unencrypted secrets on every session start, closing the "hooks silently inactive on a
# fresh clone" drift. The blog is its reference home; this script copies it (and the SessionStart
# settings entry) into each sibling repo that has a .claude/ dir, so the guard is consistent
# everywhere and re-syncable when it improves.
#
# SAFE + REVIEWABLE by design:
#   - DRY-RUN by default: prints what it WOULD do per repo; changes nothing. Pass --apply to write.
#   - Copies the guard script verbatim; MERGES the SessionStart entry into settings.json only if it
#     isn't already present (never clobbers other hooks). Uses python3 for the JSON merge.
#   - Never commits — you review each repo's diff and commit per repo (respects per-repo ownership).
#
# Usage (run from the blog repo root):
#   sh scripts/sync-setup-guard.sh            # dry run — show the plan
#   sh scripts/sync-setup-guard.sh --apply    # write the guard + settings entry into each repo
set -u

SIBLINGS_DIR="${EB_SIBLINGS_DIR:-$(cd .. && pwd)}"
GUARD_SRC=".githooks/repo-setup-guard.sh"
APPLY=0
[ "${1:-}" = "--apply" ] && APPLY=1

[ -f "$GUARD_SRC" ] || { echo "FATAL: run from the blog repo root ($GUARD_SRC not found)."; exit 2; }

merge_settings() {
  # $1 = target settings.json path. Adds the SessionStart guard hook if absent. python3 required.
  python3 - "$1" <<'PY'
import json, sys, io
path = sys.argv[1]
try:
    with io.open(path, encoding="utf-8") as f:
        cfg = json.load(f)
except Exception as e:
    print(f"    ! could not read {path}: {e}")
    sys.exit(1)
hooks = cfg.setdefault("hooks", {})
ss = hooks.setdefault("SessionStart", [])
cmd = "sh .githooks/repo-setup-guard.sh"
present = any(
    h.get("command") == cmd
    for grp in ss for h in grp.get("hooks", [])
)
if present:
    print("    = SessionStart guard already present — leaving settings.json unchanged.")
    sys.exit(0)
ss.insert(0, {"hooks": [{"type": "command", "command": cmd}]})
with io.open(path, "w", encoding="utf-8") as f:
    json.dump(cfg, f, indent=2)
    f.write("\n")
print("    + added SessionStart guard to settings.json")
PY
}

echo "sync-setup-guard: $([ "$APPLY" = 1 ] && echo APPLY || echo 'DRY RUN (pass --apply to write)')"
echo "siblings dir: $SIBLINGS_DIR"
echo ""

for repo in "$SIBLINGS_DIR"/earlbear*/; do
  repo="${repo%/}"
  name=$(basename "$repo")
  [ -d "$repo/.git" ] || continue
  [ "$name" = "earlbear-blog" ] && continue          # the source; already has it
  [ -f "$repo/.claude/settings.json" ] || continue   # only repos that run Claude hooks

  echo "• $name"
  # 1) copy the guard script
  if [ -f "$repo/.githooks/repo-setup-guard.sh" ] && cmp -s "$GUARD_SRC" "$repo/.githooks/repo-setup-guard.sh"; then
    echo "    = guard script already up to date"
  elif [ "$APPLY" = 1 ]; then
    mkdir -p "$repo/.githooks"
    cp "$GUARD_SRC" "$repo/.githooks/repo-setup-guard.sh"
    chmod +x "$repo/.githooks/repo-setup-guard.sh"
    echo "    + copied .githooks/repo-setup-guard.sh"
  else
    echo "    ~ would copy .githooks/repo-setup-guard.sh"
  fi
  # 2) merge the SessionStart settings entry
  if [ "$APPLY" = 1 ]; then
    merge_settings "$repo/.claude/settings.json"
  else
    echo "    ~ would add SessionStart guard to .claude/settings.json (if absent)"
  fi
done

echo ""
echo "Done. $([ "$APPLY" = 1 ] && echo 'Review each repo diff and commit per repo.' || echo 'Re-run with --apply to write.')"
