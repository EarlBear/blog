#!/usr/bin/env python3
"""Advisory: does a post's *content* match its declared *audience*?

check-audience.py GUARDS the mechanism — it makes sure a declared audience is
valid and never leaks into the wrong build. This check is the missing JUDGMENT
half: it reads what a post actually says and flags a likely mis-classification, so
an internal-sounding post isn't quietly marked `external` (a real disclosure risk),
and a plainly-public post isn't over-restricted to `internal`.

It is heuristic and ADVISORY — it never blocks. A human makes the call; this just
surfaces the ones worth a second look, so nobody has to eyeball all of them.

Signals that a post reads INTERNAL:
  - internal hostnames / infra (`*.internal.earlbear.com`, Cloudflare Access,
    wrangler, the internal deploy path)
  - "not shipped / not yet / internal-only / do not share / roadmap" framing
  - secrets/credentials operational detail, unreleased-plan language

Signals that a post reads EXTERNAL (public-safe):
  - customer/product storytelling, "we built / here's how / lessons learned"

Two modes, same contract as the other post checks (hook via stdin JSON / --check).
"""
import json
import re
import sys
from pathlib import Path

POSTS_DIR = Path("src/content/blog")

# Phrases that lean INTERNAL. Weighted: some are near-certain (an internal
# hostname), others are soft hints (roadmap language).
INTERNAL_SIGNALS = [
    (r"\binternal\.earlbear\.com\b", 3, "internal hostname"),
    (r"\bcloudflare access\b", 2, "Cloudflare Access (internal gating)"),
    (r"\bwrangler\b", 1, "wrangler (internal deploy)"),
    (r"\bdo not share\b|\bconfidential\b|\binternal[- ]only\b", 3, "explicit internal marker"),
    (r"\bnot (?:yet )?(?:shipped|released|public|launched)\b", 2, "unreleased framing"),
    (r"\broadmap\b|\bunreleased\b|\bpre-?launch\b", 1, "roadmap/unreleased language"),
    (r"\bour (?:internal )?(?:runbook|playbook|on-?call|incident)\b", 2, "internal ops detail"),
]

# Phrases that lean EXTERNAL (public product/engineering storytelling). These
# reduce confidence that a post is internal.
EXTERNAL_SIGNALS = [
    (r"\bhere'?s how we\b|\bwe built\b|\bwhat we learned\b|\blessons\b", 1),
    (r"\bcustomer(s)?\b|\bstorefront(s)?\b|\becommerce\b", 1),
]


def parse_frontmatter(text: str):
    m = re.match(r"^---\n(.*?)\n---\n?(.*)$", text, re.S)
    if not m:
        return {}, text
    fm_text, body = m.group(1), m.group(2)
    fm = {}
    mm = re.search(r"^audience:\s*(\S+)\s*$", fm_text, re.M)
    if mm:
        fm["audience"] = mm.group(1).strip().strip("'\"")
    md = re.search(r"^draft:\s*(\S+)\s*$", fm_text, re.M)
    if md:
        fm["draft"] = md.group(1).strip()
    return fm, body


def strip_code(body: str) -> str:
    out, in_fence = [], False
    for line in body.splitlines():
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
            continue
        if not in_fence:
            out.append(re.sub(r"`[^`]*`", "", line))
    return "\n".join(out)


def score(body: str):
    text = strip_code(body).lower()
    internal, reasons = 0, []
    for pat, weight, why in INTERNAL_SIGNALS:
        if re.search(pat, text):
            internal += weight
            reasons.append(why)
    external = sum(w for pat, w in EXTERNAL_SIGNALS if re.search(pat, text))
    return internal, external, reasons


# A recurring EarlBear authoring pattern: a post ships as a PAIR — an external "what it
# does" story (`X.mdx`) plus a more detailed internal companion (`X-design.mdx`). The two
# halves are DELIBERATELY different audiences, so the naive "this internal post reads
# public, move it to external" nudge is wrong for a companion, and an external half whose
# detail lives in a hidden design doc warrants EXTRA scrutiny, not less.
def pair_role(path: Path):
    """Return ('design', base) if this is an internal design companion; ('lead', base) if
    it's the external lead of a pair that HAS a -design companion; else (None, None)."""
    stem = path.stem  # filename without .mdx
    if stem.endswith("-design"):
        base = stem[: -len("-design")]
        return ("design", base)
    companion = path.with_name(f"{stem}-design{path.suffix}")
    if companion.exists():
        return ("lead", stem)
    return (None, None)


def check_post(path: Path, root: Path):
    warns = []
    rel = path.relative_to(root)
    fm, body = parse_frontmatter(path.read_text(encoding="utf-8", errors="ignore"))
    declared = fm.get("audience", "(unset)")
    internal, external, reasons = score(body)
    role, _base = pair_role(path)

    # Reads internal but marked external → the disclosure-risk direction. Flag on a
    # strong internal signal (weight ≥3, i.e. a hostname or explicit marker) or a
    # clear net-internal lean. The LEAD of a pair gets extra scrutiny: its polished public
    # story fronts a detailed internal companion, so lower the bar to flag it for a look.
    lead_threshold = 2 if role == "lead" else 3
    if declared == "external" and (internal >= lead_threshold or internal - external >= lead_threshold):
        extra = (
            " (this is the public LEAD of a paired post — its detailed companion is internal, "
            "so be extra sure the mechanism isn't over-shared here; see external-post-review)"
            if role == "lead" else ""
        )
        warns.append(
            f"{rel}: marked audience: external but reads internal "
            f"(signals: {', '.join(sorted(set(reasons)))}). Confirm it's safe to "
            f"publish publicly, or move it to audience: internal.{extra}"
        )
    # Reads clearly external but marked internal → possibly over-restricted. BUT: if the post
    # is part of a PAIR (it has a -design companion, or IS the -design companion), being
    # internal is a deliberate authoring decision — the lead is the public story, the detailed
    # half stays internal. Don't nudge either half toward external just for reading polished.
    # That was the ecommerce-site-scanner false-nudge: an internal lead (whose detail lives in
    # its -design companion) flagged as "move to external". A pairing already IS the audience
    # decision, so suppress the over-restriction nudge for any paired internal post.
    elif declared == "internal" and external >= 2 and internal == 0 and role is None:
        warns.append(
            f"{rel}: marked audience: internal but reads like public product "
            "writing with no internal signals. Confirm it needs to stay internal, "
            "or move it to audience: external."
        )
    return warns


def touched_post(payload, root):
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
                post = touched_post(payload, root)
                if post is None or not post.exists():
                    return 0
                targets = [post]
        except Exception:
            pass

    if targets is None:
        d = root / POSTS_DIR
        targets = sorted(p for p in d.iterdir() if p.suffix in (".md", ".mdx")) if d.is_dir() else []

    warns = []
    for post in targets:
        warns.extend(check_post(post, root))

    if not warns:
        if not hook_mode:
            print(f"audience fit OK — {len(targets)} post(s): content matches declared audience.")
        return 0

    header = ("[audience-fit] a post's content may not match its audience —"
              if hook_mode else "Audience-fit review:")
    print(header, file=sys.stderr)
    for w in warns:
        print("  " + w, file=sys.stderr)
    return 0  # advisory


if __name__ == "__main__":
    sys.exit(main())
