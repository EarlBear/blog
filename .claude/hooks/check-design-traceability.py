#!/usr/bin/env python3
"""Guard the `design:` back-reference — the blog end of plan→design→blog traceability.

A post may declare `design: <slug>` to point at the design doc it "powers". The
design docs live in a SIBLING repo (earlbear-agentic-workflow), so the committed
docs/design-registry.json is the contract this check validates against — it works
even when that repo is not checked out.

Three layers (this hook is layers 2 and 3; the zod schema is layer 1):
  1. SCHEMA (src/content.config.ts) — `design` must be a lowercase-kebab slug, so a
     sentence or a typo fails the build. (Not this file.)
  2. REGISTRY MEMBERSHIP — BLOCKING. Every `design:` value on a post must be a key in
     the registry's `slugs`. A slug not in the registry is a broken back-reference
     (a renamed/removed design, or a typo) and is rejected. No sibling repo needed.
  3. DOC EXISTENCE — ADVISORY. With --check-docs, verify each registry entry resolves
     to a real file under the registry's docRoot (the sibling repo). Skips gracefully
     when the sibling repo is absent, so it never blocks the common path.

Modes (same contract as the other post checks):
  - Hook (stdin PostToolUse JSON): if an edited post has a `design:` value not in the
    registry, print BLOCKED to stderr and exit 2 (blocks the edit). Otherwise exit 0.
  - `--check` (CLI): validate every post's `design:` against registry membership;
    exit 1 on any violation. Run via `npm run design-check`.
  - `--check-docs` (CLI, opt-in): additionally verify each registry entry's doc file
    exists under docRoot; advisory (exit 0) and skips if the sibling repo is absent.
    Run via `npm run design-docs-check`.
"""
import json
import re
import sys
from pathlib import Path

POSTS_DIR = Path("src/content/blog")
REGISTRY = Path("docs/design-registry.json")
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def load_registry(root: Path):
    p = root / REGISTRY
    if not p.is_file():
        return None
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return None
    return data


def design_value(text: str):
    """Return the raw `design:` frontmatter value of a post, or None."""
    m = re.match(r"^---\n(.*?)\n---", text, re.S)
    if not m:
        return None
    mm = re.search(r"^design:\s*(.+?)\s*$", m.group(1), re.M)
    if not mm:
        return None
    return mm.group(1).strip().strip("'\"")


def all_posts(root: Path):
    d = root / POSTS_DIR
    if not d.is_dir():
        return []
    return [p for p in sorted(d.iterdir()) if p.suffix in (".md", ".mdx")]


def violations_for(value, registry):
    """Return a violation string for a single design: value, or None if OK."""
    slugs = registry.get("slugs", {})
    if not SLUG_RE.match(value):
        return (f"design value {value!r} is not a kebab-case slug "
                f"(the schema should also reject this)")
    if value not in slugs:
        near = [s for s in slugs if value in s or s in value]
        hint = f" Did you mean {near[0]!r}?" if near else ""
        return (f"design slug {value!r} is not in docs/design-registry.json — a broken "
                f"back-reference.{hint} Add it to the registry (with its design doc "
                f"path) or fix the slug.")
    return None


def touched_post(payload, root):
    ti = payload.get("tool_input", {}) or {}
    fp = ti.get("file_path") or ti.get("notebook_path") or ""
    if not fp:
        return None
    p = Path(fp)
    try:
        rel = p.relative_to(root)
    except ValueError:
        rel = p
    if str(rel.parent).replace("\\", "/") == str(POSTS_DIR) and rel.suffix in (".md", ".mdx"):
        return p if p.is_absolute() else root / rel
    return None


def main() -> int:
    root = Path.cwd()
    registry = load_registry(root)

    # ── CLI: --check-docs (advisory registry↔sibling-repo drift) ────────────────
    if "--check-docs" in sys.argv[1:]:
        if registry is None:
            print("design-docs: no docs/design-registry.json — nothing to check.")
            return 0
        doc_root = (root / registry.get("docRoot", "")).resolve()
        if not doc_root.is_dir():
            print(f"design-docs (advisory): sibling design dir not present "
                  f"({registry.get('docRoot')}) — skipping doc-existence check. "
                  "The registry is the contract; run this where the sibling repo is checked out.")
            return 0
        missing = []
        for slug, doc in registry.get("slugs", {}).items():
            if not (doc_root / doc).is_file():
                missing.append(f"{slug} → {doc} (not found under {registry.get('docRoot')})")
        if missing:
            print(f"design-docs (advisory): {len(missing)} registry entr(y/ies) point at a "
                  "missing doc — the design doc was renamed or removed in the sibling repo:")
            for m in missing:
                print(f"  • {m}")
            print("Update docs/design-registry.json to match. (Advisory — not a build failure.)")
        else:
            print(f"design-docs OK — all {len(registry.get('slugs', {}))} registry entries "
                  "resolve to a real doc in the sibling repo.")
        return 0  # advisory: never non-zero

    # ── CLI: --check (blocking registry membership across all posts) ────────────
    if "--check" in sys.argv[1:]:
        if registry is None:
            print("design-check: no docs/design-registry.json found — cannot validate "
                  "design: back-references.", file=sys.stderr)
            return 1
        bad, n = [], 0
        for p in all_posts(root):
            val = design_value(p.read_text(encoding="utf-8", errors="ignore"))
            if val is None:
                continue
            n += 1
            v = violations_for(val, registry)
            if v:
                bad.append(f"{p.relative_to(root)}: {v}")
        if bad:
            print("design-check FAILED — broken design: back-reference(s):", file=sys.stderr)
            for b in bad:
                print(f"  • {b}", file=sys.stderr)
            return 1
        print(f"design OK — {n} post(s) with a design: back-reference, all in the registry. "
              "(Run design-docs-check to verify the docs exist in the sibling repo.)")
        return 0

    # ── Hook mode (PostToolUse): block an edit that introduces a bad slug ────────
    raw = sys.stdin.read()
    if not raw.strip():
        return 0
    try:
        payload = json.loads(raw)
    except Exception:
        return 0
    if not (isinstance(payload, dict) and "tool_name" in payload):
        return 0
    post = touched_post(payload, root)
    if post is None or not post.exists():
        return 0
    val = design_value(post.read_text(encoding="utf-8", errors="ignore"))
    if val is None:
        return 0  # no design: back-ref on this post — nothing to guard
    if registry is None:
        # Can't validate without the contract; warn but don't block.
        print("design-traceability: a post declares design: but docs/design-registry.json "
              "is missing — cannot validate. (Not blocking.)", file=sys.stderr)
        return 0
    v = violations_for(val, registry)
    if v:
        print("BLOCKED: broken design: back-reference after this edit —", file=sys.stderr)
        print(f"  {post.relative_to(root) if post.is_absolute() else post}: {v}", file=sys.stderr)
        print("A design: slug must be a key in docs/design-registry.json (the plan→design→blog "
              "traceability contract). Fix the slug or register it.", file=sys.stderr)
        return 2  # block the edit
    return 0


if __name__ == "__main__":
    sys.exit(main())
