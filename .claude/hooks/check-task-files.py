#!/usr/bin/env python3
"""Guard the task-file invariant:
  - docs/tasks/done.md    contains ONLY closed tasks  (`- [x] …`)
  - docs/tasks/backlog.md contains ONLY open tasks    (`- [ ] …`)

Two modes:
  1. Hook mode (stdin = PostToolUse JSON): if the tool touched a task file,
     re-check both files; on violation exit 2 with an explanation so Claude
     fixes it. Non-task-file edits are ignored (exit 0).
  2. CLI mode (no stdin / `--check`): check both files, print a report,
     exit 0 clean / 1 on violation. Used by `make tasks-check`.

Only lines beginning with the task-item bullet `- [x]` / `- [ ]` are treated as
tasks; header prose that merely mentions `[x]` is ignored.
"""
import json
import re
import sys
from pathlib import Path

DONE = "docs/tasks/done.md"
BACKLOG = "docs/tasks/backlog.md"

OPEN_RE = re.compile(r"^\s*-\s*\[\s\]\s")     # - [ ]
DONE_RE = re.compile(r"^\s*-\s*\[[xX]\]\s")   # - [x]


def violations(root: Path):
    errs = []
    dpath, bpath = root / DONE, root / BACKLOG

    if dpath.exists():
        for i, line in enumerate(dpath.read_text(encoding="utf-8", errors="ignore").splitlines(), 1):
            if OPEN_RE.match(line):
                errs.append(f"{DONE}:{i}: OPEN task in done.md → move to {BACKLOG}: {line.strip()}")
    if bpath.exists():
        for i, line in enumerate(bpath.read_text(encoding="utf-8", errors="ignore").splitlines(), 1):
            if DONE_RE.match(line):
                errs.append(f"{BACKLOG}:{i}: DONE task in backlog.md → move to {DONE}: {line.strip()}")
    return errs


def touched_task_file(payload) -> bool:
    ti = payload.get("tool_input", {}) or {}
    blob = json.dumps(ti)
    return ("docs/tasks/done.md" in blob) or ("docs/tasks/backlog.md" in blob)


def main() -> int:
    root = Path.cwd()

    # CLI mode is explicit (`--check`) so we NEVER block on stdin.read() under
    # `make`, where stdin is neither a tty nor closed. Hook mode is the default
    # (Claude Code pipes JSON on stdin).
    cli_flag = "--check" in sys.argv[1:]
    raw = "" if cli_flag else sys.stdin.read()

    hook_mode = False
    if raw.strip():
        try:
            payload = json.loads(raw)
            if isinstance(payload, dict) and "tool_name" in payload:
                hook_mode = True
                if not touched_task_file(payload):
                    return 0  # unrelated edit — nothing to check
        except Exception:
            pass  # fall through to CLI mode

    errs = violations(root)
    if not errs:
        if not hook_mode:
            print("task files OK — done.md has only closed tasks, backlog.md only open tasks.")
        return 0

    header = "Task-file invariant violated:" if not hook_mode else \
        "BLOCKED: task-file invariant violated after this edit —"
    print(header, file=sys.stderr)
    for e in errs:
        print("  " + e, file=sys.stderr)
    print("Fix: closed tasks (`- [x] … @done(...) #git:...`) belong in done.md; "
          "open tasks (`- [ ] …`) belong in backlog.md.", file=sys.stderr)
    return 2 if hook_mode else 1


if __name__ == "__main__":
    sys.exit(main())
