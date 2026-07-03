#!/usr/bin/env python3
"""PreToolUse hook: block TaskUpdate `status: deleted` unless the task has first
been recorded in docs/tasks/done.md or docs/tasks/backlog.md.

Rationale: tasks must be persisted to the markdown task files BEFORE they are
destroyed from the live task list, so nothing is silently dropped.

Wiring (see .claude/settings.json):
  hooks.PreToolUse[].matcher = "TaskUpdate"
  command = "python3 .claude/hooks/guard-task-deletion.py"

Contract:
  - stdin: JSON with tool_name + tool_input (Claude Code PreToolUse payload)
  - exit 0  -> allow (not a deletion, or the task is recorded)
  - exit 2  -> BLOCK; stderr is shown back to Claude so it can self-correct
"""
import json
import re
import sys
from pathlib import Path

TASK_FILES = ["docs/tasks/done.md", "docs/tasks/backlog.md"]


def norm(s: str) -> str:
    """Lowercase + collapse whitespace + drop a leading bracket tag/status noise
    so '[USER] Connect shop...' matches 'connect shop...' in the md files."""
    s = s.lower()
    s = re.sub(r"\[[^\]]*\]", " ", s)          # strip [MANUAL]/[USER]/[x]/[ ] tags
    s = re.sub(r"@done\([^)]*\)", " ", s)      # strip @done(...) timestamps
    s = re.sub(r"[`*_#>-]", " ", s)            # strip md punctuation
    s = re.sub(r"\s+", " ", s).strip()
    return s


def significant_tokens(s: str) -> list[str]:
    """Keep tokens >3 chars that carry meaning, for a fuzzy containment check."""
    return [t for t in norm(s).split() if len(t) > 3]


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0  # never break the tool on a parse error of our own

    if payload.get("tool_name") != "TaskUpdate":
        return 0

    ti = payload.get("tool_input", {}) or {}
    if str(ti.get("status", "")).lower() != "deleted":
        return 0  # only guard actual deletions

    # Repo root: hook cwd is the project dir.
    root = Path.cwd()
    corpus_parts = []
    for rel in TASK_FILES:
        p = root / rel
        if p.exists():
            corpus_parts.append(p.read_text(encoding="utf-8", errors="ignore"))
    corpus = norm("\n".join(corpus_parts))

    if not corpus.strip():
        print(
            "BLOCKED: TaskUpdate status=deleted, but no task files found at "
            f"{TASK_FILES}. Record the task there (done.md if closed as "
            "'- [x] … @done(<isoTimestamp>)', backlog.md if open as '- [ ] …') "
            "before deleting.",
            file=sys.stderr,
        )
        return 2

    # We only get taskId, not subject text — so require the caller to include a
    # `subject` (or description) so we can verify it's recorded. If TaskUpdate
    # carries no text to match, ask for it explicitly rather than guess.
    text = " ".join(
        str(ti.get(k, "")) for k in ("subject", "description") if ti.get(k)
    ).strip()

    if not text:
        print(
            "BLOCKED: cannot verify task #%s is recorded before deletion — "
            "TaskUpdate carried no `subject`/`description` to match against "
            "docs/tasks/*.md. First ensure the task line exists in done.md "
            "(closed) or backlog.md (open), then re-issue the delete WITH the "
            "task's `subject` so this hook can confirm it." % ti.get("taskId", "?"),
            file=sys.stderr,
        )
        return 2

    toks = significant_tokens(text)
    # Consider it recorded if a strong majority of significant tokens are present.
    if toks:
        hits = sum(1 for t in toks if t in corpus)
        if hits >= max(2, int(len(toks) * 0.6)):
            return 0

    print(
        "BLOCKED: task \"%s\" does not appear to be recorded in %s yet. "
        "Add it first — done.md as '- [x] %s @done(<isoTimestamp>)' if closed, "
        "or backlog.md as '- [ ] %s' if still open — then delete."
        % (text, TASK_FILES, text, text),
        file=sys.stderr,
    )
    return 2


if __name__ == "__main__":
    sys.exit(main())
