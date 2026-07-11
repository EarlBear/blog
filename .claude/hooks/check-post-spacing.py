#!/usr/bin/env python3
"""Catch common post SPACING / layout smells that check-posts.py can't see.

check-posts.py reads markdown SOURCE — it can't see rendered layout, so subtle
spacing bugs (dots not centered in a matrix column, a table that overflows the
page, a footnote ref that rendered as literal text) ship unnoticed. This is the
recurring "looks fine in source, broken in pixels" gap. This hook narrows it with
two cheap, deterministic checks — no headless browser.

Two layers, both advisory (WARN, never block — spacing is a judgment call, same
posture as the voice checks):

  1. CSS INVARIANTS (src/styles/global.css) — guard the shared-component layout
     rules that keep known bugs fixed, so a future edit can't silently regress
     them. Today: the ComparisonMatrix must center its data columns (the ●/○/◐
     marks) and must reserve a consistent option-header height (so the CHOSEN
     badge can't inflate the header band taller than the data rows). These are the
     exact two bugs that recurred; if the rules that fix them disappear, warn.

  2. POST SMELLS — for each post with UNCOMMITTED changes (git diff, so the check
     stays cheap and only fires on what you're actively editing), scan the .mdx
     for layout smells that render badly:
       - a raw-HTML <table> / wide block with no overflow-x scroll wrapper
         (pushes the page sideways on mobile — the blog tenet is it scrolls inside
         its own container).
       - a footnote ref [^id] trapped inside a raw-HTML block (renders as literal
         "[^id]" text — markdown skips inline processing inside HTML blocks).

Two modes (same contract as check-posts.py / check-task-files.py):
  - Hook mode (stdin = PostToolUse JSON): if the tool touched a post or
    global.css, run the relevant checks on the changed surface; print advisories.
    ALWAYS exit 0 (advisory — never blocks an edit).
  - CLI mode (`--check`): run both layers over the whole repo, print a report,
    exit 0 (or 1 only if `--strict` and something is found — for CI, not the hook).
"""
import json
import re
import subprocess
import sys
from pathlib import Path

POSTS_DIR = "src/content/blog"
CSS_PATH = "src/styles/global.css"


def repo_root() -> Path:
    # The hook runs from the blog repo root (Astro project). Walk up to find it.
    here = Path(__file__).resolve()
    for p in [here.parent, *here.parents]:
        if (p / CSS_PATH).exists():
            return p
    return Path.cwd()


# ── Layer 1: CSS invariants ─────────────────────────────────────────────────
# Each invariant: (human name, list of regexes that ALL must be present in the CSS).
# Written loosely (whitespace-tolerant) so reformatting doesn't false-positive; the
# point is "the alignment rule still exists," not an exact-string match.
CSS_INVARIANTS = [
    (
        "ComparisonMatrix centers its data columns (the ●/○/◐ marks)",
        # td.cm-cell (and the option headers) must declare text-align: center,
        # else the marks fall back to the base th/td text-align:left and hug the
        # left edge — the horizontal-centering bug.
        [r"td\.cm-cell", r"text-align:\s*center"],
    ),
    (
        "ComparisonMatrix reserves a consistent option-header height (badge can't inflate it)",
        # .cm-option must set a height so a CHOSEN-badged header matches a plain
        # one — else the badge stacks under the label and the header row grows
        # ~2x a data row (the vertical-rhythm bug).
        [r"\.cm-option\s*\{[^}]*height:"],
    ),
]


def check_css_invariants(css_text: str) -> list[str]:
    out = []
    for name, patterns in CSS_INVARIANTS:
        for pat in patterns:
            if not re.search(pat, css_text, re.S | re.I):
                out.append(
                    f"CSS invariant weakened — {name}. "
                    f"Expected a rule matching /{pat}/ in {CSS_PATH}; it's gone or changed. "
                    f"This is a known spacing fix (see check-post-spacing.py); restore it or "
                    f"update the invariant if the layout was deliberately redesigned."
                )
                break  # one message per invariant is enough
    return out


# ── Layer 2: post smells ────────────────────────────────────────────────────
RAW_HTML_BLOCK_TAGS = ("<table", "<figure", "<div", "<section", "<ul", "<ol")
FOOTNOTE_REF_RE = re.compile(r"\[\^[A-Za-z0-9_-]+\]")


def strip_code(text: str) -> str:
    # Drop fenced code blocks AND inline code spans so a <table> mentioned as text
    # (e.g. `/rest/v1/<table>` or `<table>` in prose) isn't mistaken for markup.
    text = re.sub(r"```.*?```", "", text, flags=re.S)
    text = re.sub(r"`[^`]*`", "", text)
    return text


def check_post_smells(post_path: Path) -> list[str]:
    out = []
    try:
        text = post_path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return out
    body = strip_code(text)
    name = post_path.name

    # Smell A: a raw-HTML <table> that can overflow — no overflow-x scroll wrapper
    # AND not already width-constrained to its container. Markdown pipe-tables are
    # globally scroll-wrapped; a HAND-WRITTEN <table> in raw HTML is not, so a wide
    # one can push the page sideways. A `width: 100%` table is bounded by its
    # container (e.g. a mock-UI widget), so it's exempt — that was a false positive.
    for tbl in re.finditer(r"<table\b[^>]*>", body):
        tag = tbl.group(0)
        width_constrained = re.search(r"width:\s*100%", tag)
        if not width_constrained and "overflow-x" not in body and "cm-scroll" not in body:
            out.append(
                f"{name}: a raw-HTML <table> with no overflow-x scroll wrapper and no "
                f"width:100% constraint. On a narrow viewport a wide one can push the whole "
                f"page sideways. Wrap it in a container with `overflow-x: auto`, set "
                f"`width: 100%`, use a markdown pipe-table (globally scroll-wrapped), or a "
                f"component (ComparisonMatrix)."
            )
            break  # one per post is enough

    # Smell B: a footnote ref trapped inside a raw-HTML block renders literally.
    # Heuristic: find raw-HTML blocks (a line opening one of the block tags up to a
    # blank line) and flag any [^id] inside them.
    for block in re.split(r"\n\s*\n", body):
        stripped = block.lstrip()
        if stripped.startswith(RAW_HTML_BLOCK_TAGS) and FOOTNOTE_REF_RE.search(block):
            ref = FOOTNOTE_REF_RE.search(block).group(0)
            out.append(
                f"{name}: footnote ref {ref} sits inside a raw-HTML block — it will render as "
                f"literal text, not a citation (markdown skips inline processing inside HTML). "
                f"Move the ref onto the markdown sentence that introduces the block."
            )
            break  # one per post is enough to prompt a look
    return out


def changed_posts(root: Path) -> list[Path]:
    """Posts with uncommitted changes (staged or unstaged, plus untracked)."""
    try:
        out = subprocess.run(
            ["git", "status", "--porcelain", "--", POSTS_DIR],
            cwd=root, capture_output=True, text=True, timeout=10,
        ).stdout
    except (subprocess.SubprocessError, OSError):
        return []
    posts = []
    for line in out.splitlines():
        # porcelain: "XY path" — take the path, handle rename "old -> new".
        path = line[3:].split(" -> ")[-1].strip()
        if path.endswith((".md", ".mdx")):
            p = root / path
            if p.exists():
                posts.append(p)
    return posts


def emit(advisories: list[str]) -> None:
    if not advisories:
        return
    print("\nspacing advisories (layout smells check-posts.py can't see):", file=sys.stderr)
    for a in advisories:
        print(f"  ~ {a}", file=sys.stderr)


def run_cli(root: Path, strict: bool) -> int:
    advisories = []
    css = root / CSS_PATH
    if css.exists():
        advisories += check_css_invariants(css.read_text(encoding="utf-8", errors="ignore"))
    for post in sorted((root / POSTS_DIR).glob("*.md")) + sorted((root / POSTS_DIR).glob("*.mdx")):
        advisories += check_post_smells(post)
    emit(advisories)
    if not advisories:
        print("spacing OK — CSS invariants intact, no layout smells found.")
    return 1 if (strict and advisories) else 0


def run_hook(root: Path, tool_input: dict) -> int:
    # Which file did the tool touch?
    path = tool_input.get("file_path") or tool_input.get("path") or ""
    advisories = []
    css = root / CSS_PATH
    # If global.css changed, re-check the invariants.
    if path.endswith("global.css") and css.exists():
        advisories += check_css_invariants(css.read_text(encoding="utf-8", errors="ignore"))
    # If a post changed, smell-check the posts that currently have uncommitted changes
    # (cheap, and covers the just-edited one).
    if POSTS_DIR in path or path.endswith((".md", ".mdx")):
        for post in changed_posts(root):
            advisories += check_post_smells(post)
    emit(advisories)
    return 0  # advisory — NEVER block an edit


def main() -> int:
    root = repo_root()
    args = sys.argv[1:]
    if "--check" in args:
        return run_cli(root, strict="--strict" in args)
    # Hook mode: read PostToolUse JSON from stdin.
    raw = sys.stdin.read()
    try:
        payload = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError:
        return 0
    return run_hook(root, payload.get("tool_input", {}) or {})


if __name__ == "__main__":
    sys.exit(main())
