#!/usr/bin/env python3
"""Warn when a post declares a visual in frontmatter but doesn't embed it.

The generic visuals-check nudges on *length*; this one enforces *intent*. A post
can declare in frontmatter what visual it should carry:

    expects: [comparison]     # → should embed a <ComparisonMatrix>
    expects: [flow]           # → a <FlowDiagram>
    expects: [use-case]       # → a <UseCaseDiagram>
    expects: [decision]       # → an <Accordion> or a <ComparisonMatrix>

If a declared visual is missing, this warns — a comparison post should never ship
as a wall of prose. Advisory (exit 0), like the other nudges; the point is to make
"I said this is a comparison but drew no matrix" visible.

The `expects` enum is validated by the zod schema in src/content.config.ts; this
check verifies the *body* actually contains the promised component.

Modes mirror the other post checks (hook via stdin JSON / CLI via --check).
"""
import json
import re
import sys
from pathlib import Path

POSTS_DIR = Path("src/content/blog")

# Each declared kind → the component(s) that satisfy it. A kind is satisfied if
# ANY of its components appears in the post body.
KIND_COMPONENTS = {
    "comparison": ["ComparisonMatrix"],
    "flow": ["FlowDiagram"],
    "use-case": ["UseCaseDiagram"],
    "decision": ["Accordion", "ComparisonMatrix"],
}


def parse_expects(text: str):
    """Pull the `expects:` list from frontmatter. Supports inline `[a, b]` and
    block-list form. Returns a list of kind strings (possibly empty)."""
    m = re.match(r"^---\n(.*?)\n---", text, re.S)
    if not m:
        return []
    fm = m.group(1)
    # Inline: expects: [comparison, flow]
    inline = re.search(r"^expects:\s*\[([^\]]*)\]\s*$", fm, re.M)
    if inline:
        return [x.strip().strip("'\"") for x in inline.group(1).split(",") if x.strip()]
    # Block:
    #   expects:
    #     - comparison
    block = re.search(r"^expects:\s*\n((?:\s*-\s*.+\n?)+)", fm, re.M)
    if block:
        return [
            line.split("-", 1)[1].strip().strip("'\"")
            for line in block.group(1).splitlines()
            if line.strip().startswith("-")
        ]
    return []


def check_post(path: Path, root: Path):
    warns = []
    rel = path.relative_to(root)
    text = path.read_text(encoding="utf-8", errors="ignore")
    expects = parse_expects(text)
    if not expects:
        return warns
    body = re.sub(r"^---\n.*?\n---\n?", "", text, flags=re.S)
    for kind in expects:
        comps = KIND_COMPONENTS.get(kind)
        if not comps:
            continue  # unknown kind — the zod enum already guards this at build
        if not any(re.search(rf"<{c}\b", body) for c in comps):
            names = " or ".join(f"<{c}>" for c in comps)
            warns.append(
                f"{rel}: frontmatter declares expects: [{kind}] but the post has no "
                f"{names}. Embed the expected visual (see the enrich-post catalog) "
                "or drop the expectation."
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
            print(f"visual expectations OK — {len(targets)} post(s): declared visuals are present.")
        return 0

    header = ("[visual-expectations] a declared visual is missing —"
              if hook_mode else "Visual-expectation gaps:")
    print(header, file=sys.stderr)
    for w in warns:
        print("  " + w, file=sys.stderr)
    return 0  # advisory


if __name__ == "__main__":
    sys.exit(main())
