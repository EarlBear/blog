#!/usr/bin/env bash
# tasks-check — run the docs/tasks/ invariant check shipped by the
# task-management-manager plugin (the loose .claude/hooks/check-task-files.py was
# removed in ef0062b when task-tracking moved to that plugin). The plugin hook
# still supports `--check` CLI mode and reads .claude/hooks/task-management.conf.
#
# The plugin now lives in the personal marketplace (oeid-claude-plugins); the old
# EarlBear marketplace places are still tried after it, so a machine that has not
# reinstalled keeps working. Within each, the source checkout (unversioned, stable
# path) wins over the versioned plugin cache.
# If the plugin isn't installed at all (e.g. a fresh clone without the
# marketplace), we skip with a note rather than fail — the enforcing copy runs as
# a settings.json hook regardless; this on-demand path is a dev convenience.
set -euo pipefail

REL="plugins/task-management-manager/hooks/check-task-files.py"
SOURCES=(
  "${EB_PLUGIN_MARKETPLACE:-$HOME/Workspace/git/oeid-claude-plugin-marketplace}"
  "$HOME/Workspace/git-earlbear/earlbear-claude-plugin-marketplace"
)
CACHES=(
  "$HOME/.claude/plugins/cache/oeid-claude-plugins/task-management-manager"
  "$HOME/.claude/plugins/cache/earlbear-claude-plugins/task-management-manager"
)

hook=""
for src in "${SOURCES[@]}"; do
  if [ -f "$src/$REL" ]; then hook="$src/$REL"; break; fi
done
if [ -z "$hook" ]; then
  for cache in "${CACHES[@]}"; do
    if [ -d "$cache" ]; then
      hook="$(find "$cache" -name check-task-files.py -maxdepth 3 2>/dev/null | sort -V | tail -1)"
      [ -n "$hook" ] && break
    fi
  done
fi

if [ -z "$hook" ] || [ ! -f "$hook" ]; then
  echo "tasks-check: task-management-manager plugin not found in ${SOURCES[*]} or ${CACHES[*]} — skipping (enforced via settings.json hook)."
  exit 0
fi

exec python3 "$hook" --check
