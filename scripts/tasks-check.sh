#!/usr/bin/env bash
# tasks-check — run the docs/tasks/ invariant check shipped by the
# task-management-manager plugin (the loose .claude/hooks/check-task-files.py was
# removed in ef0062b when task-tracking moved to that plugin). The plugin hook
# still supports `--check` CLI mode and reads .claude/hooks/task-management.conf.
#
# We resolve the hook from wherever the plugin lives, preferring the marketplace
# source checkout (unversioned, stable path) over the versioned plugin cache.
# If the plugin isn't installed at all (e.g. a fresh clone without the
# marketplace), we skip with a note rather than fail — the enforcing copy runs as
# a settings.json hook regardless; this on-demand path is a dev convenience.
set -euo pipefail

MARKETPLACE="${EB_PLUGIN_MARKETPLACE:-$HOME/Workspace/git-earlbear/earlbear-claude-plugin-marketplace}"
CACHE="$HOME/.claude/plugins/cache/earlbear-claude-plugins/task-management-manager"

hook=""
# 1) marketplace source (no version in path)
if [ -f "$MARKETPLACE/plugins/task-management-manager/hooks/check-task-files.py" ]; then
  hook="$MARKETPLACE/plugins/task-management-manager/hooks/check-task-files.py"
# 2) newest installed version in the plugin cache
elif [ -d "$CACHE" ]; then
  hook="$(find "$CACHE" -name check-task-files.py -maxdepth 3 2>/dev/null | sort -V | tail -1)"
fi

if [ -z "$hook" ] || [ ! -f "$hook" ]; then
  echo "tasks-check: task-management-manager plugin not found — skipping (enforced via settings.json hook)."
  exit 0
fi

exec python3 "$hook" --check
