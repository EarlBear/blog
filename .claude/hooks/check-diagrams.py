#!/usr/bin/env python3
"""Validate that diagram/component usage in posts is actually imported.

A post that writes `<FlowDiagram .../>` but forgets the matching
`import FlowDiagram from ...` only fails at *render* time — and because the
production build excludes drafts, a broken draft passes `astro build`, `posts-check`,
and every other gate silently. This check catches that class of bug statically:
for each .mdx post, every JSX component tag used must have a corresponding import.

(Plain .md posts can't embed components, so they're skipped. `.astro`/HTML-ish
lowercase tags like <div>/<svg> are ignored — only Capitalized component tags,
which is how Astro/MDX distinguishes components from HTML elements.)

Two modes, same contract as check-posts.py:
  1. Hook mode (stdin = PostToolUse JSON): if the tool touched an .mdx post,
     validate that file; on violation exit 2 so Claude fixes it.
  2. CLI mode (`--check`): validate every .mdx post, print a report,
     exit 0 clean / 1 on violation. Used by `npm run diagrams-check`.
"""
import json
import re
import sys
from pathlib import Path

POSTS_DIR = Path("src/content/blog")

# A used component: a JSX tag whose name starts with an uppercase letter.
# Matches <FlowDiagram ...>, <Accordion>, <UseCaseDiagram/>. Not <div>, <svg>.
COMPONENT_USE_RE = re.compile(r"<([A-Z][A-Za-z0-9_]*)\b")
# An import that provides a name: `import Name from '...'` or
# `import { A, B } from '...'`. We collect every bound name.
IMPORT_DEFAULT_RE = re.compile(r"^\s*import\s+([A-Z][A-Za-z0-9_]*)\s+from\s")
IMPORT_NAMED_RE = re.compile(r"^\s*import\s*\{([^}]*)\}\s*from\s")


def imported_names(text: str) -> set:
    names = set()
    for line in text.splitlines():
        m = IMPORT_DEFAULT_RE.match(line)
        if m:
            names.add(m.group(1))
        m = IMPORT_NAMED_RE.match(line)
        if m:
            for part in m.group(1).split(","):
                name = part.strip().split(" as ")[-1].strip()
                if name:
                    names.add(name)
    return names


def strip_code(body: str) -> str:
    """Drop fenced blocks AND inline `code` spans, so a component name shown in an
    example or a placeholder like `meta=<JWT>` isn't mistaken for a real usage. A
    real component tag is authored as bare JSX, never inside backticks."""
    out, in_fence = [], False
    for line in body.splitlines():
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
            continue
        if not in_fence:
            out.append(re.sub(r"`[^`]*`", "", line))  # strip inline code spans
    return "\n".join(out)


def check_post(path: Path, root: Path) -> list:
    errs = []
    rel = path.relative_to(root)
    text = path.read_text(encoding="utf-8", errors="ignore")
    # Split frontmatter from body; imports live in the body, right after the ---.
    m = re.match(r"^---\n.*?\n---\n?(.*)$", text, re.S)
    body = m.group(1) if m else text
    body = strip_code(body)

    used = set(COMPONENT_USE_RE.findall(body))
    if not used:
        return errs
    imported = imported_names(text)
    # Fragments and built-ins that need no import.
    ignore = {"Fragment"}
    for name in sorted(used - imported - ignore):
        errs.append(
            f"{rel}: uses <{name}> but never imports it — add "
            f"`import {name} from '../../components/{name}.astro';` after the "
            "frontmatter (see the enrich-post skill)."
        )
    return errs


def touched_post(payload):
    ti = payload.get("tool_input", {}) or {}
    fp = ti.get("file_path") or ti.get("notebook_path") or ""
    p = Path(fp)
    try:
        rel = p.relative_to(Path.cwd())
    except ValueError:
        rel = p
    if str(rel.parent).replace("\\", "/") == str(POSTS_DIR) and rel.suffix == ".mdx":
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
                    return 0  # unrelated edit
                targets = [post]
        except Exception:
            pass

    if targets is None:
        targets = sorted((root / POSTS_DIR).glob("*.mdx"))

    errs = []
    for post in targets:
        errs.extend(check_post(post, root))

    if not errs:
        if not hook_mode:
            print(f"diagrams OK — {len(targets)} .mdx post(s): every component used is imported.")
        return 0

    header = ("BLOCKED: a component is used but not imported —" if hook_mode
              else "Diagram/component check failed:")
    print(header, file=sys.stderr)
    for e in errs:
        print("  " + e, file=sys.stderr)
    return 2 if hook_mode else 1


if __name__ == "__main__":
    sys.exit(main())
