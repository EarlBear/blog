#!/bin/sh
# concurrent-capture.sh — save any uncommitted changes this session did NOT just
# commit, so a concurrent session's in-progress work is never left exposed in the
# shared working tree. Run from a post-commit hook (index lock already released)
# and callable directly (see the concurrent-commit skill).
#
# The model (shared working dir, many sessions, one branch):
#   Discipline: a session stages ONLY its own files (`git add <my paths>`), so at
#   commit time STAGED == my work and anything left UNSTAGED/UNTRACKED == another
#   session's in-progress work. This script runs from post-commit, i.e. right
#   after my own commit lands, and:
#   1. Tags a backup ref at HEAD so every prior state is recoverable by name (not
#      just via the reflog).
#   2. Sweeps everything still dirty (the other session's leftover WIP) into a
#      separate "auto-capture" commit, so it is never left exposed where a later
#      `git add -A` / checkout / branch-switch could clobber it.
#
# It NEVER rewrites history (no amend/reset/rebase) — only ever ADDS commits. The
# other session can later reword/split/build on its captured commit; pull.rebase +
# rerere (set by scripts/setup-concurrency.sh) replay everyone's work cleanly on
# top when branches converge.
#
# Guards against loops: the auto-capture commit itself leaves the tree clean, so
# a post-commit re-entry finds nothing to do and exits.

set -eu

# Re-entrancy guard: don't let the auto-capture commit trigger another capture.
if [ "${EB_CAPTURE_RUNNING:-}" = "1" ]; then
    exit 0
fi

# Anything left dirty after the just-finished commit? (tracked or untracked)
if [ -z "$(git status --porcelain)" ]; then
    exit 0  # clean tree — nothing another session left behind
fi

# Timestamp for the backup tag. Callers may pass one (the hooks can't rely on a
# clean `date` in all shells, but /bin/date is fine here).
TS="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_TAG="backup/${TS}"

# Belt-and-suspenders: tag current HEAD so this exact state is recoverable by name.
# (-f so a same-second re-run doesn't error.)
git tag -f "$BACKUP_TAG" HEAD >/dev/null 2>&1 || true

# Stage EVERYTHING still present and commit it as a clearly-labeled safety commit.
# We bundle rather than risk losing: better a mixed WIP commit than orphaned work.
EB_CAPTURE_RUNNING=1 git add -A
if git diff --cached --quiet; then
    exit 0  # nothing actually staged (e.g. ignored-only) — done
fi

EB_CAPTURE_RUNNING=1 git commit --no-verify -m "chore: auto-capture concurrent changes

Uncommitted changes left in the shared working tree by another session,
swept into their own commit so nothing is lost. Safe to reword, split, or
build on — see the concurrent-commit skill. Backup ref: ${BACKUP_TAG}.

Co-Authored-By: Claude <noreply@anthropic.com>" >/dev/null

echo "  [concurrent-capture] saved leftover working-tree changes as a safety commit (backup: ${BACKUP_TAG})"
