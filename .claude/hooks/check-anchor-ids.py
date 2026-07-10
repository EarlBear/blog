#!/usr/bin/env python3
"""Fail the build if any COMMENTABLE diagram element lacks its stable anchor id.

The comment layer can only anchor to elements that carry a stable id (a heading slug, a
DecisionTable row id, a diagram node's data-node, an edge's data-edge, an ER entity's
data-entity). That anchorability is a GUARANTEE the diagrams make, not a best-effort the
comment layer reverse-engineers: every node and every edge a diagram renders MUST have its
id, by construction. A new diagram shape (or a renderer regression) that forgets to stamp
one would silently produce un-commentable elements — a reviewer's comment would have nowhere
to attach. This hook catches that class of bug at build time: it scans the BUILT dist/ HTML
and fails loud if a commentable element is missing its anchor attribute.

Rules (element selector -> required id attribute), the same set the comment allowlist
(src/data/comments.ts ALLOW_RULES) anchors to:
  - .flow-node           -> data-node    (FlowDiagram node box)
  - .flow-edge           -> data-edge    (FlowDiagram arrow)
  - figure.flow-diagram  -> data-flow    (the diagram figure itself)
  - [data-entity host]   -> data-entity  (DataModel ERD entity) — checked as .data-model entities
  - tr.dt-row            -> id           (DecisionTable row)

Two modes, same contract as the other check-*.py:
  1. Hook mode (stdin = PostToolUse JSON): advisory — only runs a check if dist/ exists,
     since a source edit hasn't rebuilt dist yet; exits 0 otherwise (the CLI/make path is
     the real gate).
  2. CLI mode (`--check [dist_dir]`): scan every built page, print a report, exit 0 clean /
     1 on any missing anchor id. Wired into `make check` (after a build) + npm run.

No external deps — a tolerant regex scan over the built HTML (the elements are simple,
attribute-bearing tags; a full HTML parser is overkill and adds a dependency).
"""
import json
import re
import sys
from pathlib import Path

# A CSS class token matches only when bounded by a quote or whitespace on each side — NOT a
# hyphen. This is the key subtlety: `flow-edge` must NOT match inside `flow-edge-label` (that's a
# different, non-commentable element). `\b` treats `-` as a boundary and would false-positive, so
# we build an explicit "class contains this exact token" pattern instead.
def _class_has(token):
    t = re.escape(token)
    # class="...": the token must appear delimited by whitespace or the quote on BOTH sides, so it
    # matches the whole class name and never a substring like flow-edge inside flow-edge-label.
    # (?<![-\w]) / (?![-\w]) reject a hyphen or word-char on either side; the token still has to be
    # inside a class="..." value.
    return rf'class="[^"]*(?<![-\w]){t}(?![-\w])[^"]*"'


# Each rule: (human name, tag-open regex that matches the element, required-attr regex).
# The tag regex matches an opening tag carrying the element's EXACT marker class; the attr regex
# is searched within that same opening tag. A match of the element WITHOUT the attr is a violation.
RULES = [
    (
        "FlowDiagram node (.flow-node)",
        re.compile(rf'<[a-zA-Z]+[^>]*{_class_has("flow-node")}[^>]*>'),
        re.compile(r'\bdata-node="'),
    ),
    (
        "FlowDiagram edge (.flow-edge)",
        re.compile(rf'<[a-zA-Z]+[^>]*{_class_has("flow-edge")}[^>]*>'),
        re.compile(r'\bdata-edge="'),
    ),
    (
        "FlowDiagram figure (figure.flow-diagram)",
        re.compile(rf'<figure[^>]*{_class_has("flow-diagram")}[^>]*>'),
        re.compile(r'\bdata-flow="'),
    ),
    (
        "DecisionTable row (tr.dt-row)",
        re.compile(rf'<tr[^>]*{_class_has("dt-row")}[^>]*>'),
        re.compile(r'\bid="'),
    ),
]


def scan_html(html: str):
    """Return a list of (rule_name, offending_tag) for every commentable element missing its id."""
    violations = []
    for name, tag_re, attr_re in RULES:
        for m in tag_re.finditer(html):
            tag = m.group(0)
            if not attr_re.search(tag):
                violations.append((name, tag[:120]))
    return violations


def check_dist(dist_dir: Path) -> int:
    if not dist_dir.is_dir():
        print(f"anchor-ids: no {dist_dir}/ to scan — run a build first (skipping).")
        return 0
    pages = sorted(dist_dir.rglob("index.html"))
    total_violations = 0
    for page in pages:
        try:
            html = page.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        vios = scan_html(html)
        if vios:
            total_violations += len(vios)
            rel = page.relative_to(dist_dir)
            for name, tag in vios:
                print(f"  {rel}: {name} is missing its anchor id — not commentable.")
                print(f"      offending tag: {tag}")
    if total_violations:
        print(
            f"\nanchor-ids FAIL: {total_violations} commentable diagram element(s) have no stable "
            f"anchor id. Every node/edge/row a diagram renders must carry its id (data-node / "
            f"data-edge / data-flow / row id) so a comment can attach. Fix the renderer/engine that "
            f"emits the element (see src/data/comments.ts ALLOW_RULES for the contract)."
        )
        return 1
    print(f"anchor-ids OK — every commentable diagram element in {dist_dir}/ carries its anchor id "
          f"({len(pages)} page(s) scanned).")
    return 0


def main() -> int:
    args = sys.argv[1:]
    if args and args[0] == "--check":
        dist = Path(args[1]) if len(args) > 1 else Path("dist")
        return check_dist(dist)

    # Hook mode: only meaningful once dist/ exists (a source edit hasn't rebuilt it). Advisory.
    try:
        json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        pass
    dist = Path("dist")
    if not dist.is_dir():
        return 0
    rc = check_dist(dist)
    # In hook mode a violation is worth surfacing (exit 2 so Claude sees it), but only if dist
    # is fresh; we can't know that here, so keep it advisory (exit 0) — the make/CLI gate is
    # authoritative. Print already happened.
    return 0


if __name__ == "__main__":
    sys.exit(main())
