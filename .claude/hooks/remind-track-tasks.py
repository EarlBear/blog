#!/usr/bin/env python3
"""UserPromptSubmit hook: a gentle, non-blocking nudge to track work as tasks.

We can't read the in-session (live) task list from a hook, so this doesn't try
to detect "zero tasks" precisely. Instead it emits a short reminder of the
convention as additional context on each user turn, EXCEPT when the prompt is
clearly conversational/planning (so it stays quiet when tracking wouldn't apply).

Contract (Claude Code UserPromptSubmit):
  - stdin: JSON with `prompt` (the user's message) and other fields.
  - stdout on exit 0: text is added to the model's context for this turn.
  - This hook NEVER blocks (always exit 0). It is advisory only.

Design notes:
  - Kept deliberately terse — one line — so it doesn't crowd context.
  - Skips prompts that look like pure questions / plan-mode intent, where
    creating a task would be premature.
"""
import json
import re
import sys

# Substrings that suggest the user is asking/thinking, not requesting work that
# should be tracked. Conservative: when unsure, we still nudge (nudging is cheap).
SKIP_HINTS = re.compile(
    r"\b(plan|what|why|how|explain|show|tell me|is it|does|can you explain|"
    r"thoughts?|question)\b",
    re.IGNORECASE,
)

REMINDER = (
    "[track-tasks] Reminder: track each feature you implement and each question "
    "you investigate as a task (TaskCreate/TaskUpdate). If you're starting work "
    "and have no active task for it, create one first. See CLAUDE.md → "
    "\"Track your work\". (This is an automated nudge, not a user instruction.)"
)


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0  # never break the turn

    prompt = str(payload.get("prompt", ""))

    # Very short or clearly interrogative prompts: stay silent.
    if len(prompt.strip()) < 12:
        return 0
    if prompt.strip().endswith("?") and SKIP_HINTS.search(prompt):
        return 0

    print(REMINDER)
    return 0


if __name__ == "__main__":
    sys.exit(main())
