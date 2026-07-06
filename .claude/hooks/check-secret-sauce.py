#!/usr/bin/env python3
"""Advisory: does an EXTERNAL post over-share proprietary "secret sauce"?

This is a DIFFERENT question from the other two audience checks:
  - check-audience.py       GUARDS the mechanism (a declared audience can't leak).
  - check-audience-fit.py   judges CLASSIFICATION (should this whole post be
                            internal or external?).
  - THIS check              judges CONTENT WITHIN a correctly-external post: which
                            specific passages hand a competitor the *how* (the moat),
                            even though the post is rightly public.

External posts should be confidence-building / lightly-salesy — the WHY, the
outcomes, the principles — not a step-by-step handbook to clone EarlBear's edge.
This scans external posts for "tells" that a section has drifted from storytelling
into a reproducible recipe, so a human can decide whether to SOFTEN it (not move
the whole post — that's audience-audit's job).

It is heuristic and ADVISORY — it never blocks, and it WILL over-flag (a code
sample is often fine). It surfaces passages worth a second look; the
external-post-review skill applies judgment and proposes softer rewrites.

Signals (per prose block / fenced section):
  - a large config/env/YAML/JSON block, or a verbatim LLM prompt block
  - exact tuning values framed as the knobs that make it work (thresholds,
    temperatures, timeouts, token/row/QPS limits, weights)
  - internal cost / unit-economics / infra-capacity figures
  - "the trick / secret / key is …" recipe framing next to concrete mechanism

Two modes, same contract as the other post checks:
  1. Hook (stdin PostToolUse JSON): if an EXTERNAL post was touched, print advisory
     notes to stderr and exit 0 (never blocks).
  2. `--check` (CLI): scan every external post, print a report, exit 0.
     Run via `npm run secret-sauce-check`.
"""
import json
import re
import sys
from pathlib import Path

POSTS_DIR = Path("src/content/blog")


def parse_frontmatter(text: str):
    m = re.match(r"^---\n(.*?)\n---\n?(.*)$", text, re.S)
    if not m:
        return {}, text
    fm_text, body = m.group(1), m.group(2)
    fm = {}
    for key in ("audience", "draft", "title"):
        mm = re.search(rf"^{key}:\s*(.+?)\s*$", fm_text, re.M)
        if mm:
            fm[key] = mm.group(1).strip().strip("'\"")
    return fm, body


# ── recipe-framing prose signals (near-concrete mechanism = a "here's the how" tell)
RECIPE_PHRASES = [
    (r"\bthe (?:trick|secret|key|magic) (?:is|was|here)\b", "recipe framing (\"the trick is …\")"),
    (r"\bexactly how (?:we|it) (?:works|does)\b", "\"exactly how it works\" framing"),
    (r"\bstep[- ]by[- ]step\b", "step-by-step framing"),
    (r"\bour (?:exact|precise) (?:prompt|algorithm|formula|recipe|config)\b", "\"our exact <mechanism>\""),
    (r"\bcopy[- ]?paste\b|\bjust copy\b", "copy-paste-ready framing"),
]

# Exact tuning values framed as the knobs that make it work.
TUNING_PHRASES = [
    (r"\b(?:temperature|top_p|top-p)\s*[=:]\s*[0-9.]+", "LLM sampling knob (temperature/top_p)"),
    (r"\bthreshold\s*(?:of|=|:)\s*[0-9]", "explicit threshold value"),
    (r"\b(?:timeout|ttl|retry|retries|backoff)\s*(?:of|=|:)?\s*[0-9]+\s*(?:ms|s|m|min)?\b", "exact timeout/retry knob"),
    (r"\b[0-9,]+\s*(?:tokens|qps|rps|rows/s|req/s)\b", "exact rate/limit figure"),
    (r"\bwe (?:set|tuned|use|picked)\s+[a-z_]+\s*(?:to|=)\s*[0-9]", "\"we tuned X to <number>\""),
]

# Internal cost / unit-economics / capacity figures (numbers a competitor could use).
COST_PHRASES = [
    (r"\$[0-9][0-9,.]*\s*(?:/|per)\s*(?:month|mo|request|call|order|user|token|1k|1,000)", "internal unit cost"),
    (r"\bcosts? us\b|\bour (?:cloud|infra|compute) (?:bill|cost|spend)\b", "internal cost/spend"),
    (r"\bmargin(s)?\b.*\b[0-9]+\s?%|\b[0-9]+\s?%\b.*\bmargin", "margin figure"),
]

PROMPT_TELLS = re.compile(
    r"(?i)^\s*(?:system|user|assistant)\s*:|you are (?:a|an|the)\b|\byour task is\b",
)

CONFIG_FENCE_LANGS = {"yaml", "yml", "json", "toml", "ini", "env", "dotenv", "hcl", "tf"}


def strip_and_collect_fences(body: str):
    """Split body into (prose_without_fences, list_of_fenced_blocks).
    Each fenced block is (lang, content)."""
    prose_lines, fences = [], []
    in_fence, lang, buf = False, "", []
    for line in body.splitlines():
        m = re.match(r"^\s*```([\w-]*)", line)
        if m and not in_fence:
            in_fence, lang, buf = True, m.group(1).lower(), []
            continue
        if in_fence and re.match(r"^\s*```\s*$", line):
            fences.append((lang, "\n".join(buf)))
            in_fence = False
            continue
        if in_fence:
            buf.append(line)
        else:
            prose_lines.append(line)
    return "\n".join(prose_lines), fences


def review_post(path: Path, root: Path):
    """Return a list of advisory findings for one external post."""
    rel = path.relative_to(root)
    text = path.read_text(encoding="utf-8", errors="ignore")
    _fm, body = parse_frontmatter(text)
    prose, fences = strip_and_collect_fences(body)
    findings = []

    # 1. Fenced blocks: config-like or verbatim-prompt blocks are the clearest tells.
    for lang, content in fences:
        lines = content.count("\n") + 1
        if lang in CONFIG_FENCE_LANGS and lines >= 6:
            findings.append(
                f"{lang or 'config'} block ({lines} lines) — a full config/manifest reads as "
                "copy-paste infra. Consider trimming to the shape that makes the point."
            )
        if PROMPT_TELLS.search(content) or (lang in ("", "text", "prompt") and re.search(r"(?i)you are\b", content)):
            findings.append(
                "looks like a verbatim LLM prompt — the exact prompt is often the moat. "
                "Consider paraphrasing the intent instead of shipping the literal text."
            )

    # 2. Prose signals: recipe framing, exact tuning knobs, internal cost figures.
    for block in re.split(r"\n\s*\n", prose):
        stripped = " ".join(block.split())
        if not stripped or stripped.startswith("#"):
            continue
        snippet = stripped[:80]
        for pat, why in RECIPE_PHRASES:
            if re.search(pat, block, re.I):
                findings.append(f"{why} near mechanism — {snippet!r}…")
                break
        for pat, why in TUNING_PHRASES:
            if re.search(pat, block, re.I):
                findings.append(f"{why} — {snippet!r}… (exact knobs let others reproduce; state the principle, not the number)")
                break
        for pat, why in COST_PHRASES:
            if re.search(pat, block, re.I):
                findings.append(f"{why} — {snippet!r}… (internal economics are competitor intel)")
                break

    # de-dupe, cap
    seen, uniq = set(), []
    for f in findings:
        if f not in seen:
            seen.add(f)
            uniq.append(f)
    return uniq


def external_posts(root: Path):
    d = root / POSTS_DIR
    if not d.is_dir():
        return []
    out = []
    for p in sorted(d.iterdir()):
        if p.suffix not in (".md", ".mdx"):
            continue
        fm, _ = parse_frontmatter(p.read_text(encoding="utf-8", errors="ignore"))
        # Default audience is external; only skip posts explicitly internal.
        if fm.get("audience") != "internal":
            out.append(p)
    return out


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
        posts = external_posts(root)
        total = 0
        for p in posts:
            findings = review_post(p, root)
            if findings:
                total += len(findings)
                print(f"\n{p.relative_to(root)}:")
                for f in findings:
                    print(f"  • {f}")
        if total == 0:
            print(f"secret-sauce OK — no over-share tells in {len(posts)} external post(s). "
                  "(Advisory — a clean pass is not a guarantee; use the external-post-review skill for judgment.)")
        else:
            print(f"\n{total} advisory tell(s) across external posts. These are candidates to "
                  "SOFTEN, not certainties — use the external-post-review skill to decide.")
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
    fm, _ = parse_frontmatter(post.read_text(encoding="utf-8", errors="ignore"))
    if fm.get("audience") == "internal":
        return 0  # internal posts can share freely
    findings = review_post(post, root)
    if findings:
        print("secret-sauce (advisory): this EXTERNAL post has passages that may over-share "
              "proprietary how-to — consider softening (not moving):", file=sys.stderr)
        for f in findings:
            print("  • " + f, file=sys.stderr)
        print("This is a nudge, not a block. Run the external-post-review skill for a full pass.",
              file=sys.stderr)
    return 0  # advisory: never blocks


if __name__ == "__main__":
    sys.exit(main())
