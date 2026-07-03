#!/usr/bin/env python3
"""Validate blog-post frontmatter and voice rules.

Every post in src/content/blog/ must have:
  - title, description, pubDate (YYYY-MM-DD)
  - questions: a non-empty list, each item ending in "?"
  - authors: a non-empty list of ids that exist in src/content/authors/
  - tags: lowercase
  - a kebab-case filename (it is the URL slug)
  - no emoji and no exclamation points in title/description (brand voice)

Two modes (same contract as check-task-files.py):
  1. Hook mode (stdin = PostToolUse JSON): if the tool touched a blog post,
     validate that file; on violation exit 2 with an explanation so Claude
     fixes it. Non-post edits are ignored (exit 0).
  2. CLI mode (`--check`): validate every post, print a report,
     exit 0 clean / 1 on violation. Used by `npm run posts-check`.

This is a fast first line of defense; `astro build` (zod schema in
src/content.config.ts) remains the authoritative gate.
"""
import json
import re
import sys
from pathlib import Path

POSTS_DIR = Path("src/content/blog")
AUTHORS_DIR = Path("src/content/authors")

SLUG_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*\.md$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
EMOJI_RE = re.compile(
    "[\U0001F000-\U0001FAFF\U00002700-\U000027BF\U0001F1E6-\U0001F1FF"
    "\U00002600-\U000026FF\U0000FE0F]"
)


def parse_frontmatter(text: str):
    """Parse the YAML subset our posts use: scalars, [inline, arrays],
    and block lists. Returns (dict | None, error | None)."""
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return None, "missing frontmatter (file must start with ---)"
    fm, key = {}, None
    for i, line in enumerate(lines[1:], 2):
        if line.strip() == "---":
            return fm, None
        if re.match(r"^\s+-\s", line):  # block-list item under current key
            if key is None:
                return None, f"line {i}: list item with no key"
            fm.setdefault(key, [])
            if not isinstance(fm[key], list):
                return None, f"line {i}: list item under scalar key {key!r}"
            fm[key].append(line.split("-", 1)[1].strip().strip("'\""))
            continue
        m = re.match(r"^([A-Za-z_][\w-]*):\s*(.*)$", line)
        if not m:
            if line.strip():
                return None, f"line {i}: unparseable frontmatter line: {line.strip()!r}"
            continue
        key, val = m.group(1), m.group(2).strip()
        if val == "":
            fm[key] = []  # expect a block list to follow
        elif val.startswith("[") and val.endswith("]"):
            inner = val[1:-1].strip()
            fm[key] = [v.strip().strip("'\"") for v in inner.split(",")] if inner else []
        else:
            fm[key] = val.strip().strip("'\"")
    return None, "frontmatter never closed (no trailing ---)"


def author_ids(root: Path):
    d = root / AUTHORS_DIR
    return {p.stem for p in d.glob("*.md")} if d.is_dir() else set()


def check_post(path: Path, root: Path):
    errs = []
    rel = path.relative_to(root)
    if not SLUG_RE.match(path.name):
        errs.append(f"{rel}: filename must be a kebab-case slug (it becomes the URL)")
    fm, perr = parse_frontmatter(path.read_text(encoding="utf-8", errors="ignore"))
    if perr:
        return errs + [f"{rel}: {perr}"]

    for field in ("title", "description", "pubDate"):
        if not fm.get(field):
            errs.append(f"{rel}: missing required frontmatter field {field!r}")

    if not DATE_RE.match(str(fm.get("pubDate", ""))):
        errs.append(f"{rel}: pubDate must be YYYY-MM-DD (got {fm.get('pubDate')!r})")

    questions = fm.get("questions")
    if not isinstance(questions, list) or not questions:
        errs.append(f"{rel}: 'questions' must be a non-empty list — the questions "
                    "this post answers, usually from the request that prompted it")
    else:
        for q in questions:
            if not q.endswith("?"):
                errs.append(f"{rel}: question does not end with '?': {q!r}")

    authors = fm.get("authors")
    if not isinstance(authors, list) or not authors:
        errs.append(f"{rel}: 'authors' must be a non-empty list of author ids")
    else:
        known = author_ids(root)
        for a in authors:
            if a not in known:
                errs.append(f"{rel}: unknown author id {a!r} (no {AUTHORS_DIR}/{a}.md — "
                            "use the manage-authors skill to add one)")

    for tag in fm.get("tags", []) or []:
        if tag != tag.lower():
            errs.append(f"{rel}: tag {tag!r} must be lowercase")

    for field in ("title", "description"):
        val = str(fm.get(field, ""))
        if "!" in val:
            errs.append(f"{rel}: {field} contains an exclamation point (brand voice: none)")
        if EMOJI_RE.search(val):
            errs.append(f"{rel}: {field} contains emoji (brand voice: none)")

    draft = fm.get("draft")
    if draft not in (None, "true", "false"):
        errs.append(f"{rel}: draft must be true or false (got {draft!r})")
    return errs


def touched_post(payload):
    ti = payload.get("tool_input", {}) or {}
    fp = ti.get("file_path") or ti.get("notebook_path") or ""
    p = Path(fp)
    try:
        rel = p.relative_to(Path.cwd())
    except ValueError:
        rel = p
    if str(rel.parent).replace("\\", "/") == str(POSTS_DIR) and rel.suffix == ".md":
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
                    return 0  # unrelated edit — nothing to check
                targets = [post]
        except Exception:
            pass  # fall through to CLI mode

    if targets is None:
        targets = sorted((root / POSTS_DIR).glob("*.md"))

    errs = []
    for post in targets:
        errs.extend(check_post(post, root))

    if not errs:
        if not hook_mode:
            print(f"posts OK — {len(targets)} post(s) pass frontmatter and voice checks.")
        return 0

    header = ("BLOCKED: post validation failed after this edit —" if hook_mode
              else "Post validation failed:")
    print(header, file=sys.stderr)
    for e in errs:
        print("  " + e, file=sys.stderr)
    print("Fix the frontmatter/voice issues above and save again "
          "(see .claude/skills/new-post). Verify with `npm run posts-check`.",
          file=sys.stderr)
    return 2 if hook_mode else 1


if __name__ == "__main__":
    sys.exit(main())
