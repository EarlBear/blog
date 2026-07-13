#!/usr/bin/env python3
"""Advisory: can a first-time reader FOLLOW this post?

A different question from the other post checks:
  - check-posts.py          GUARDS frontmatter + brand voice (mechanism).
  - check-audience*.py       judge audience (classification / leak-guard).
  - check-secret-sauce.py    judges over-sharing on external posts (content moat).
  - THIS check               judges COMPREHENSION: does the story carry a reader
                             who has zero prior context on this system?

The failure mode this catches is a post that is correct, polished, and impossible to
follow because it assumes context the reader was never given — an EarlBear-local term
used before it's introduced, or a declared question the body never actually answers.

It is heuristic and ADVISORY — it never blocks, and it WILL over-flag (a term may be
introduced in a phrasing the scanner doesn't recognize). It surfaces the MECHANICAL
tells (undefined terms, unanswered questions); the reader-review skill applies the
judgment a scanner can't (the cold open, the unexplained leap, the narrative spine,
the landing).

Two modes, same contract as the other post checks:
  1. Hook (stdin PostToolUse JSON): if a post was touched, print advisory notes to
     stderr and exit 0 (never blocks).
  2. `--check` (CLI): scan every post, print a report, exit 0.
     Run via `npm run reader-check`.
"""
import json
import re
import sys
from pathlib import Path

POSTS_DIR = Path("src/content/blog")

# EarlBear-local terms a newcomer does NOT arrive with — each should be introduced
# on first use, or linked to the post that introduces it. Generic industry terms
# (RLS, JWT, 404, Postgres) are intentionally NOT here — a reader is assumed to know
# those. Keep this list to jargon that is local to THIS system.
LOCAL_TERMS = [
    "mart", "marts",
    "the scan fleet", "scan fleet",
    "the snapshot builder", "snapshot builder",
    "the two-build split", "two-build split",
    "the drift guard", "drift guard",
    "CF Access", "Cloudflare Access",
    "the publishable key", "publishable key",
    "the anon key", "anon key",
    "the pitch deck", "pitch deck",
    "the comment layer", "comment layer",
    "the audience split", "audience split",
    "minted token", "minted JWT", "the signing key", "signing key",
    "the static build", "the live build",
    "the internal site", "the external site",
]

# A term counts as "introduced / linked" at a position if, at or before it, the post:
#   - links out (markdown link or an <a>/…/> to another post), OR
#   - defines it inline with a copula/appositive ("a mart is", "marts —", "called a mart")
# These are coarse on purpose; the skill makes the real call.
INTRO_NEAR = re.compile(
    r"(?:\bis\b|\bare\b|\bmeans\b|\bcalled\b|—|–|\(|:)", re.I
)


def parse_frontmatter(text: str):
    m = re.match(r"^---\n(.*?)\n---\n?(.*)$", text, re.S)
    if not m:
        return {}, text, ""
    fm_text, body = m.group(1), m.group(2)
    fm = {}
    for key in ("audience", "draft", "title"):
        mm = re.search(rf"^{key}:\s*(.+?)\s*$", fm_text, re.M)
        if mm:
            fm[key] = mm.group(1).strip().strip("'\"")
    # questions: a YAML list of "- ..." lines under `questions:`
    questions = []
    qm = re.search(r"^questions:\s*\n((?:\s*-\s*.+\n?)+)", fm_text, re.M)
    if qm:
        for line in qm.group(1).splitlines():
            lm = re.match(r"\s*-\s*(.+?)\s*$", line)
            if lm:
                questions.append(lm.group(1).strip().strip("'\""))
    fm["questions"] = questions
    return fm, body, fm_text


def strip_fences_and_frontmatter(body: str) -> str:
    """Drop fenced code blocks and JSX component attributes — a term inside a
    <FlowDiagram detail="…"> or a code block is not the prose introducing it."""
    out, in_fence = [], False
    for line in body.splitlines():
        if re.match(r"^\s*```", line):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        out.append(line)
    return "\n".join(out)


STOPWORDS = {
    "the", "a", "an", "is", "are", "was", "were", "why", "what", "how", "which",
    "and", "or", "to", "of", "in", "on", "for", "our", "we", "us", "it", "this",
    "that", "these", "those", "do", "does", "did", "not", "no", "so", "but",
    "with", "from", "at", "by", "be", "as", "can", "could", "should", "would",
    "each", "any", "its", "their", "there", "here", "when", "who", "you", "your",
}


def keywords(q: str):
    """Content words from a question — used to check the body addresses it."""
    words = re.findall(r"[a-zA-Z][a-zA-Z_-]{2,}", q.lower())
    return [w for w in words if w not in STOPWORDS]


def review_post(path: Path, root: Path):
    """Return a list of advisory findings for one post."""
    text = path.read_text(encoding="utf-8", errors="ignore")
    fm, body, _ = parse_frontmatter(text)
    prose = strip_fences_and_frontmatter(body)
    prose_lower = prose.lower()
    findings = []

    # 1. Undefined local terms: a term whose FIRST prose occurrence has no intro/link
    #    signal on its line or the line before, and no outbound link earlier in the post.
    lines = prose.splitlines()
    # positions of outbound links (markdown [..](/..) or href)
    link_line = None
    for i, ln in enumerate(lines):
        if re.search(r"\]\((?:/|https?:)", ln) or re.search(r'href=', ln):
            link_line = i
            break
    seen_terms = set()
    for i, ln in enumerate(lines):
        low = ln.lower()
        for term in LOCAL_TERMS:
            t = term.lower()
            if t in seen_terms:
                continue
            # word-ish boundary match
            if re.search(rf"(?<![a-z]){re.escape(t)}(?![a-z])", low):
                seen_terms.add(t)
                context = ln + " " + (lines[i - 1] if i > 0 else "")
                introduced = bool(INTRO_NEAR.search(context))
                linked_before = link_line is not None and link_line <= i
                if not introduced and not linked_before:
                    snippet = " ".join(ln.split())[:70]
                    findings.append(
                        f"term {term!r} used with no nearby intro or link — a newcomer "
                        f"may not have it. {snippet!r}…"
                    )
    # cap term findings so one jargon-heavy post doesn't drown the report
    if len(findings) > 6:
        extra = len(findings) - 6
        findings = findings[:6] + [f"(+{extra} more undefined-term tell(s) — jargon-dense; consider an on-ramp)"]

    # 2. Declared questions the body doesn't visibly answer: if NONE of a question's
    #    content keywords appear in the body, it's likely unanswered.
    for q in fm.get("questions", []):
        kws = keywords(q)
        if not kws:
            continue
        hits = sum(1 for k in kws if k in prose_lower)
        if hits == 0:
            findings.append(
                f"declared question may be unanswered — no keywords from it appear in "
                f"the body: {q!r}"
            )
        elif hits == 1 and len(kws) >= 4:
            findings.append(
                f"declared question is thinly addressed (1 of {len(kws)} keywords in body) "
                f"— check the reader can point to the answer: {q!r}"
            )

    # 3. Long orientation-free run: a single unbroken PROSE paragraph with no
    #    orienting break is where a reader gets lost. Only real prose counts — a
    #    markdown table or a bullet/numbered list is not a wall of text (a reader
    #    scans those), and prose word-density is the visuals lane's job
    #    (check-visual-density.py), so this fires only on a genuinely long single
    #    paragraph, which is the reader-flow tell.
    for block in re.split(r"\n\s*\n", prose):
        raw_lines = [l for l in block.splitlines() if l.strip()]
        if not raw_lines:
            continue
        first = raw_lines[0].lstrip()
        # skip headings, JSX/HTML, tables, and list blocks — not prose paragraphs
        if first.startswith(("#", "<", "|", ">")):
            continue
        if any(re.match(r"\s*(?:[-*+]|\d+\.)\s", l) for l in raw_lines):
            continue  # a list, not a paragraph
        b = " ".join(block.split())
        # a paragraph is one block of continuous prose; >200 words with no sentence
        # break to rest on is the tell (higher bar than the density hook, on purpose)
        if len(b.split()) > 200:
            findings.append(
                f"very long unbroken paragraph ({len(b.split())} words) — a reader has "
                f"nowhere to rest. Break it, or pull the structure into a diagram/list. "
                f"{b[:60]!r}…"
            )

    # de-dupe, keep order
    seen, uniq = set(), []
    for f in findings:
        if f not in seen:
            seen.add(f)
            uniq.append(f)
    return uniq


def all_posts(root: Path):
    d = root / POSTS_DIR
    if not d.is_dir():
        return []
    return [p for p in sorted(d.iterdir()) if p.suffix in (".md", ".mdx")]


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
    if "--check" in sys.argv[1:]:
        posts = all_posts(root)
        total = 0
        for p in posts:
            findings = review_post(p, root)
            if findings:
                total += len(findings)
                print(f"\n{p.relative_to(root)}:")
                for f in findings:
                    print(f"  • {f}")
        if total == 0:
            print(f"reader-flow OK — no undefined-term or unanswered-question tells in "
                  f"{len(posts)} post(s). (Advisory — a clean pass is not a guarantee; the "
                  "cold open, the leaps, the spine, and the landing are judgment the "
                  "reader-review skill makes.)")
        else:
            print(f"\n{total} advisory tell(s) across posts. These are candidates for a "
                  "reader-perspective pass, not verdicts — use the reader-review skill to judge "
                  "where the STORY actually breaks.")
        return 0  # advisory: never non-zero

    # hook mode
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

    findings = review_post(post, root)
    if not findings:
        return 0  # nothing mechanical to say; don't nag on every keystroke
    print(
        "reader-flow (advisory): you touched a post. A first-time reader may lose the "
        "thread here — run the reader-review skill for the full read.",
        file=sys.stderr,
    )
    print(
        "  The scan below catches MECHANICAL tells (local terms used before they're "
        "introduced, declared questions the body may not answer). It does NOT catch the "
        "cold open, the unexplained leap, the narrative spine, or the landing — those are "
        "the read a human/agent does. A clean scan is not proof the story follows.",
        file=sys.stderr,
    )
    print("  Tells the scan flagged (candidates, not verdicts):", file=sys.stderr)
    for f in findings:
        print("    • " + f, file=sys.stderr)
    print("This is a nudge, not a block.", file=sys.stderr)
    return 0  # advisory: never blocks


if __name__ == "__main__":
    sys.exit(main())
