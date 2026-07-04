---
name: concurrent-commit
description: Commit safely when multiple sessions share this one working directory, and recover work if a commit collides. Use when the user says "commit" and other sessions may be active, when you see commits/files you didn't create appear mid-session, when a commit or amend seems to have overwritten someone's work, or when a rebase/pull is blocked or conflicting. Explains the auto-capture + replay-on-top model, the git hooks that enforce it, and the recovery playbook (reflog, backup/ tags) for getting any "lost" work back.
---

# Commit safely under concurrent sessions

This repo is often edited by **several sessions at once, all sharing one working
directory and one `.git`** (the `Workspace/` and `workplace/` paths are the same
folder on a case-insensitive filesystem). They share the working tree, the index,
`HEAD`, and the current branch. So the danger is not merge conflicts — it's
sessions racing on the same tree, and history-rewrites destroying commits another
session just made.

The rule that makes this safe: **bundle rather than lose, and never rewrite shared
history.** Add commits; don't rewrite them.

## The model (what the hooks do for you)

Wired by `make install-hooks` (`scripts/setup-concurrency.sh` +
`core.hooksPath=.githooks`):

- **Stage only your own files.** `git add <your paths>` — never `git add .` when
  you're about to commit. At commit time this makes **staged = your work**, and
  anything **unstaged/untracked = another session's in-progress work**.
- **`post-commit` auto-capture** (`scripts/concurrent-capture.sh`): right after
  your commit lands, it tags a `backup/<timestamp>` ref at your commit, then
  sweeps any *leftover* dirty tree (the other session's WIP) into its own
  `chore: auto-capture concurrent changes` commit. Nothing is left exposed where a
  later `git add -A` or checkout could clobber it.
- **Auto-replay on top** (`pull.rebase=true`, `rebase.autoStash=true`,
  `rerere.enabled=true`): when another session's work lands below yours, your
  commits rebase cleanly on top instead of creating a merge tangle, and repeated
  conflict resolutions are remembered.
- **`pre-rebase` guard**: blocks ad-hoc `git rebase` (which can drop others'
  commits) unless you set `EB_ALLOW_REWRITE=1`. The automatic pull/replay path is
  allowed.

## Committing your work

1. **Stage your own paths explicitly** (never `git add -A` / `git add .`):
   ```bash
   git add src/content/blog/<your-post>.md src/components/<yours> ...
   ```
2. **Sanity-check what's staged** is only yours:
   ```bash
   git diff --cached --name-only        # should list ONLY your files
   git status --short                   # the rest is other sessions' WIP — leave it
   ```
3. **Commit.** The `post-commit` hook then auto-captures the leftover WIP:
   ```bash
   git commit -m "<your message>"
   # → your clean commit, then a "chore: auto-capture concurrent changes" commit
   #   on top holding whatever else was dirty. Both are real commits; nothing lost.
   ```
   To skip the auto-capture for one commit (rare): `EB_NO_CAPTURE=1 git commit ...`.

Never `git commit --amend`, `git reset --hard`, or `git rebase` a commit you did
not create in this session — another session may own it. Append instead.

## When another session's work was auto-captured

That's expected and safe. The `chore: auto-capture concurrent changes` commit
holds it; the owning session can reword, split, or build on it. Its message names
the `backup/<ts>` ref for the pre-capture state.

## Recovery playbook (get "lost" work back)

Git almost never truly loses committed work — it's in the reflog and the
`backup/` tags. Work down this list.

- **A commit seems to have vanished / an amend overwrote one:**
  ```bash
  git reflog -20                       # every HEAD move, including pre-rewrite
  git log --oneline --all --reflog | grep -i "<a word from the message>"
  git show <sha>                        # confirm it's the work you want
  git cherry-pick <sha>                 # bring it back onto the current branch
  ```
- **Restore the exact pre-commit / pre-capture state by name:**
  ```bash
  git tag -l 'backup/*'                 # timestamped snapshots, newest last
  git show backup/<ts>                  # inspect
  git branch recover/<name> backup/<ts> # check it out on a rescue branch, cherry-pick what you need
  ```
- **Uncommitted changes disappeared** (a checkout/reset clobbered the tree):
  ```bash
  git fsck --lost-found                 # dangling blobs/commits
  git stash list                        # autoStash may have parked them
  ```
- **A pull/replay hit a conflict:** resolve the files, `git add` them, then
  `git rebase --continue`. `rerere` remembers the resolution for next time. If it
  looks wrong, `git rebase --abort` returns to the pre-rebase state (also captured
  as a `backup/` tag).

## When to get a human

- Two sessions edited the **same lines of the same file** and the auto-replay
  can't reconcile them cleanly — surface the conflict, don't guess which side wins.
- A `backup/` tag or reflog entry you need has aged out (reflog keeps ~90 days).
- You're about to do anything with `EB_ALLOW_REWRITE=1` on a branch other sessions
  are actively using — confirm first.

## Notes

- The auto-capture commit is intentionally a bundle (it uses `git add -A` on the
  leftovers): better a mixed WIP commit that preserves everything than orphaned
  work. Owners clean it up later.
- These settings are **local to this clone** (set by `setup-concurrency.sh`); they
  don't touch global git config.
- Task-log files (`docs/tasks/backlog.md`, `done.md`) are edited by every session —
  treat them as **append-only**: add your line, never rewrite lines you didn't add,
  and `npm run tasks-check` still guards the done/backlog invariant.
