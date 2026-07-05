#!/usr/bin/env python3
"""Nudge toward interleaving visuals — a picture is worth a thousand words.

Blog tenet: don't ship a wall of text. When a section runs long without a
diagram, chart, image, table, or even a code block near it, a visual almost
always carries the idea better than three more paragraphs. This check WARNS
(never blocks) when an H2 section exceeds a word threshold with no visual in it,
naming the section so the author knows exactly where to reach for the diagram
catalog (see the enrich-post skill).

Advisory by design — a genuinely prose section (a short note, a reflection) is
fine. The point is to make a wall of text a *deliberate* choice, not an accident.

Two modes, same contract as the other post checks:
  1. Hook mode (stdin = PostToolUse JSON): if the tool touched a post, check it;
     always exits 0 (advisory — prints warnings to stderr, never blocks).
  2. CLI mode (`--check`): check every post, print a report, exit 0. Used by
     `npm run visuals-check`.
"""
import json
import re
import sys
from pathlib import Path

POSTS_DIR = Path("src/content/blog")

# A section past this many prose words with no visual reads as a wall of text.
WORD_THRESHOLD = 280

# What counts as a "visual" inside a section: a diagram component, media, a
# markdown table, or an embedded HTML widget/chart (a calculator, a CSS chart —
# these are authored as raw block HTML like <div>/<input>/<table>, see
# life-without-earlbear.md).
VISUAL_RE = re.compile(
    r"<FlowDiagram|<UseCaseDiagram|<Accordion|<figure|<img|<svg"  # components / media
    r"|<div|<table|<input|<canvas"  # embedded HTML widgets / charts
    r"|^\s*\|.*\|",  # a markdown table row
    re.M,
)


def strip_frontmatter(text: str) -> str:
    m = re.match(r"^---\n.*?\n---\n?(.*)$", text, re.S)
    return m.group(1) if m else text


def prose_word_count(section_body: str) -> int:
    """Words outside fenced code blocks and component/HTML blocks — the actual
    prose a reader wades through."""
    out, in_fence = [], False
    for line in section_body.splitlines():
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        # Skip obvious component/HTML/table lines — they aren't prose.
        s = line.lstrip()
        if s.startswith("<") or s.startswith("|") or s.startswith("import "):
            continue
        out.append(line)
    return len(re.findall(r"[A-Za-z0-9']+", " ".join(out)))


def check_post(path: Path, root: Path) -> list:
    warns = []
    rel = path.relative_to(root)
    body = strip_frontmatter(path.read_text(encoding="utf-8", errors="ignore"))

    # Split into H2 sections; the preamble before the first H2 is its own block.
    parts = re.split(r"^## (.+)$", body, flags=re.M)
    # parts = [preamble, head1, body1, head2, body2, ...]
    sections = [("(intro)", parts[0])]
    for i in range(1, len(parts), 2):
        sections.append((parts[i].strip(), parts[i + 1] if i + 1 < len(parts) else ""))

    for head, sec in sections:
        # A fenced code block counts as a visual break too — it's not a wall of prose.
        has_visual = bool(VISUAL_RE.search(sec)) or "```" in sec
        words = prose_word_count(sec)
        if words > WORD_THRESHOLD and not has_visual:
            warns.append(
                f"{rel}: section “{head}” is {words} words with no visual. "
                "A picture is worth a thousand words — interleave a diagram, chart, "
                "or image (see the enrich-post skill + catalog), or split the section."
            )
    return warns


def touched_post(payload):
    ti = payload.get("tool_input", {}) or {}
    fp = ti.get("file_path") or ti.get("notebook_path") or ""
    p = Path(fp)
    try:
        rel = p.relative_to(Path.cwd())
    except ValueError:
        rel = p
    if str(rel.parent).replace("\\", "/") == str(POSTS_DIR) and rel.suffix in (".md", ".mdx"):
        return p if p.is_absolute() else Path.cwd() / rel
    return None


def main() -> int:
    root = Path.cwd()
    cli_flag = "--check" in sys.argv[1:]
    raw = "" if cli_flag else sys.stdin.read()

    hook_mode, targets = False, None
    if raw.strip():
        try:
            payload = json.loads(raw)
            if isinstance(payload, dict) and "tool_name" in payload:
                hook_mode = True
                post = touched_post(payload)
                if post is None or not post.exists():
                    return 0
                targets = [post]
        except Exception:
            pass

    if targets is None:
        targets = sorted(
            p for p in (root / POSTS_DIR).iterdir() if p.suffix in (".md", ".mdx")
        )

    warns = []
    for post in targets:
        warns.extend(check_post(post, root))

    if not warns:
        if not hook_mode:
            print(f"visuals OK — {len(targets)} post(s): no wall-of-text sections.")
        return 0

    header = ("[visual-density] a picture is worth a thousand words —"
              if hook_mode else "Visual-density suggestions:")
    print(header, file=sys.stderr)
    for w in warns:
        print("  " + w, file=sys.stderr)
    # ADVISORY: never block. Always exit 0.
    return 0


if __name__ == "__main__":
    sys.exit(main())
