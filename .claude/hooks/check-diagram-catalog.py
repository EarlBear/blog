#!/usr/bin/env python3
"""Keep the diagram catalog a living artifact — flag drift, don't block.

The catalog (`.claude/skills/enrich-post/catalog.md`) is the menu of diagram
techniques the `enrich-post` skill picks from. It only stays useful if it lists
what actually exists. This check WARNS when the code has a diagram capability the
catalog doesn't mention:

  1. A diagram *component* — a `src/components/*Diagram.astro` or `Accordion.astro`
     — whose name never appears in catalog.md.
  2. A `FlowDiagram` *shape* (a value in its `shape?:` union) not named in
     catalog.md.

Advisory (always exits 0): adding a primitive and forgetting the catalog row is
easy; this nudges you to close the loop (see the new-diagram-kind skill).

Modes mirror the other post checks:
  1. Hook mode (stdin = PostToolUse JSON): if the tool touched a diagram
     component or the catalog, run the full check; print warnings, exit 0.
  2. CLI mode (`--check`): run and report; exit 0. Used by `npm run catalog-check`.
"""
import json
import re
import sys
from pathlib import Path

COMPONENTS_DIR = Path("src/components")
CATALOG = Path(".claude/skills/enrich-post/catalog.md")
FLOW = Path("src/components/FlowDiagram.astro")

# Components that are diagram/visual primitives the catalog should cover. Matches
# *Diagram and *Matrix components plus the named visual primitives (Accordion).
DIAGRAM_COMPONENT_RE = re.compile(r"(?:.*Diagram|.*Matrix|Accordion)\.astro$")


def diagram_components(root: Path):
    d = root / COMPONENTS_DIR
    if not d.is_dir():
        return []
    return sorted(
        p.stem for p in d.glob("*.astro") if DIAGRAM_COMPONENT_RE.match(p.name)
    )


def flow_shapes(root: Path):
    """Extract the shape union from FlowDiagram's `shape?: 'a' | 'b' ...`."""
    f = root / FLOW
    if not f.is_file():
        return []
    text = f.read_text(encoding="utf-8", errors="ignore")
    m = re.search(r"shape\?\s*:\s*([^;\n]+)", text)
    if not m:
        return []
    return sorted(set(re.findall(r"'([a-z]+)'", m.group(1))))


def main() -> int:
    root = Path.cwd()
    cli_flag = "--check" in sys.argv[1:]
    raw = "" if cli_flag else sys.stdin.read()

    hook_mode = False
    if raw.strip():
        try:
            payload = json.loads(raw)
            if isinstance(payload, dict) and "tool_name" in payload:
                hook_mode = True
                ti = payload.get("tool_input", {}) or {}
                fp = str(ti.get("file_path") or "")
                # Only run in-hook when a diagram component or the catalog changed.
                touched_relevant = (
                    fp.endswith(".astro")
                    and ("Diagram" in fp or "Accordion" in fp)
                ) or fp.endswith("catalog.md")
                if not touched_relevant:
                    return 0
        except Exception:
            pass

    if not (root / CATALOG).is_file():
        return 0  # no catalog → nothing to keep in sync
    catalog_text = (root / CATALOG).read_text(encoding="utf-8", errors="ignore")

    warns = []
    for comp in diagram_components(root):
        if comp not in catalog_text:
            warns.append(
                f"diagram component `{comp}` is not mentioned in "
                f"{CATALOG} — add a technique row so enrich-post can find it "
                "(see the new-diagram-kind skill)."
            )
    for shape in flow_shapes(root):
        # Match the shape as a word, e.g. `shape="branch"` or "branch" in prose.
        if not re.search(rf'\b{re.escape(shape)}\b', catalog_text):
            warns.append(
                f'FlowDiagram shape "{shape}" is not documented in {CATALOG} — '
                "add or update its row so the catalog stays a living artifact."
            )

    if not warns:
        if not hook_mode:
            print("catalog OK — every diagram component and FlowDiagram shape is documented.")
        return 0

    header = ("[diagram-catalog] the catalog is out of sync with the code —"
              if hook_mode else "Diagram-catalog drift:")
    print(header, file=sys.stderr)
    for w in warns:
        print("  " + w, file=sys.stderr)
    return 0  # advisory — never block


if __name__ == "__main__":
    sys.exit(main())
