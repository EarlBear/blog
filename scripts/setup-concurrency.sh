#!/bin/sh
# setup-concurrency.sh — configure this clone for safe concurrent sessions in a
# shared working directory. Idempotent; run once (make install-hooks calls it).
#
# What it sets and why:
#   pull.rebase=true       — when others' work lands below, replay ours on top
#                            (a linear history, no accidental merge commits).
#   rebase.autoStash=true  — a rebase auto-stashes/ò-restores dirty tree changes,
#                            so a replay never aborts on an unstaged file.
#   rerere.enabled=true    — remember how a conflict was resolved and reapply it,
#                            so repeated replays of the same work don't re-prompt.
#   merge.ff=false is NOT set — we want fast-forwards when possible.
#
# These are LOCAL (repo-scoped) settings — they don't touch the user's globals.
set -eu

git config pull.rebase true
git config rebase.autoStash true
git config rerere.enabled true
git config rerere.autoUpdate true

echo "  concurrency config set: pull.rebase, rebase.autoStash, rerere (local to this repo)"
