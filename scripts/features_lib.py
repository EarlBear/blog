#!/usr/bin/env python3
"""Shared engine for the docs/features/ "why" system.

A *feature doc* (docs/features/<id>.md) explains WHY a feature exists and links
the exact code blocks that implement it, via GitHub-permalink-style anchors:

    - https://github.com/EarlBear/blog/blob/<sha>/<path>#L<start>-L<end> — label

Drift detection is content-hash based, NOT text-diff based. A cache
(docs/features/.anchors.json) stores, per anchor, the normalized hash of the
referenced block. To check drift we recompute the current on-disk block's hash
and compare. This makes anchors survive renames and line-shifts: on a miss we
scan the repo for the same hash and, if found, the block only MOVED — we re-key
the cache silently. Only a hash that exists nowhere is real drift.

Cache key:   "<path>#L<start>-L<end>"   (commitId lives in the doc URL only)
Cache value: { "hash": "<sha256>", "context": "<sha256>", "feature": "<id>",
               "label": "<text>", "url": "<full permalink>" }

Used by:
  - .claude/hooks/check-feature-docs.py  (PostToolUse drift check + self-heal)
  - scripts/features_check.py             (`npm run features:check` full sweep)
  - the feature-docs skill                (author / reconcile docs)
"""
from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass, asdict
from pathlib import Path

# --- repo layout -----------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parent.parent
FEATURES_DIR = REPO_ROOT / "docs" / "features"
CACHE_PATH = FEATURES_DIR / ".anchors.json"

# Lines of surrounding context hashed alongside the block, so two byte-identical
# blocks in different places don't collide when we relocate by hash.
CONTEXT_LINES = 3

# Files we never scan when relocating a moved block (build output, deps, vcs).
SCAN_IGNORE_DIRS = {"node_modules", "dist", ".astro", ".git", ".anchors.json"}

# Matches a GitHub blob permalink and captures sha, path, start, end.
#   https://github.com/<owner>/<repo>/blob/<sha>/<path>#L<start>-L<end>
#   ...#L<start>            (single line; end defaults to start)
ANCHOR_URL_RE = re.compile(
    r"https?://github\.com/[^/]+/[^/]+/blob/(?P<sha>[0-9a-f]+)/"
    r"(?P<path>[^#\s]+)#L(?P<start>\d+)(?:-L(?P<end>\d+))?"
)


@dataclass
class Anchor:
    path: str          # repo-relative
    start: int         # 1-indexed, inclusive
    end: int           # 1-indexed, inclusive
    sha: str = ""      # commit id from the permalink (provenance only)
    label: str = ""
    feature: str = ""  # feature id (doc stem) this anchor belongs to
    url: str = ""      # the full permalink as written in the doc

    @property
    def key(self) -> str:
        return f"{self.path}#L{self.start}-L{self.end}"


# --- hashing ---------------------------------------------------------------

def normalize(lines: list[str]) -> str:
    """Normalize a block so formatting-only edits don't trip drift:
    strip trailing whitespace on each line, drop leading/trailing blank lines,
    and collapse runs of blank lines to one."""
    stripped = [ln.rstrip() for ln in lines]
    # collapse internal blank runs
    out: list[str] = []
    for ln in stripped:
        if ln == "" and out and out[-1] == "":
            continue
        out.append(ln)
    # trim leading/trailing blanks
    while out and out[0] == "":
        out.pop(0)
    while out and out[-1] == "":
        out.pop()
    return "\n".join(out)


def _sha256(text: str) -> str:
    return "sha256:" + hashlib.sha256(text.encode("utf-8")).hexdigest()


def read_lines(path: str) -> list[str] | None:
    p = REPO_ROOT / path
    if not p.exists() or not p.is_file():
        return None
    return p.read_text(encoding="utf-8", errors="ignore").splitlines()


def block_hash(path: str, start: int, end: int) -> tuple[str, str] | None:
    """Return (block_hash, context_hash) for the given 1-indexed line range,
    or None if the file/range is unreadable."""
    lines = read_lines(path)
    if lines is None:
        return None
    n = len(lines)
    if start < 1 or start > n:
        return None
    end = min(end, n)
    block = lines[start - 1 : end]
    ctx_start = max(0, start - 1 - CONTEXT_LINES)
    ctx_end = min(n, end + CONTEXT_LINES)
    context = lines[ctx_start:ctx_end]
    return _sha256(normalize(block)), _sha256(normalize(context))


# --- cache -----------------------------------------------------------------

def load_cache() -> dict:
    if CACHE_PATH.exists():
        try:
            return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def save_cache(cache: dict) -> None:
    FEATURES_DIR.mkdir(parents=True, exist_ok=True)
    CACHE_PATH.write_text(json.dumps(cache, indent=2, sort_keys=True) + "\n", encoding="utf-8")


# --- parsing feature docs --------------------------------------------------

def parse_doc_anchors(doc_path: Path) -> list[Anchor]:
    """Extract all anchors from one feature doc."""
    feature = doc_path.stem
    text = doc_path.read_text(encoding="utf-8", errors="ignore")
    anchors: list[Anchor] = []
    for line in text.splitlines():
        m = ANCHOR_URL_RE.search(line)
        if not m:
            continue
        start = int(m.group("start"))
        end = int(m.group("end")) if m.group("end") else start
        # label = anything after an em/en dash or hyphen following the url
        label = ""
        tail = line[m.end():].strip()
        label = re.sub(r"^[—–-]\s*", "", tail).strip()
        anchors.append(
            Anchor(
                path=m.group("path"),
                start=start,
                end=end,
                sha=m.group("sha"),
                label=label,
                feature=feature,
                url=m.group(0),
            )
        )
    return anchors


def all_anchors() -> list[Anchor]:
    """Every anchor across every feature doc."""
    if not FEATURES_DIR.exists():
        return []
    out: list[Anchor] = []
    for doc in sorted(FEATURES_DIR.glob("*.md")):
        out.extend(parse_doc_anchors(doc))
    return out


# --- relocation (rename / line-shift survival) -----------------------------

def _iter_source_files():
    for p in REPO_ROOT.rglob("*"):
        if not p.is_file():
            continue
        rel = p.relative_to(REPO_ROOT)
        if any(part in SCAN_IGNORE_DIRS for part in rel.parts):
            continue
        yield rel


def find_block_by_hash(target_block: str, target_context: str, span: int) -> tuple[str, int, int] | None:
    """Scan the repo for a block of `span` lines whose normalized hash equals
    `target_block`. Prefer a match whose surrounding context also matches (to
    disambiguate identical blocks). Returns (path, start, end) or None.

    Returns only if the match is UNAMBIGUOUS (exactly one context-confirmed hit,
    or exactly one block-only hit when no context matches)."""
    block_hits: list[tuple[str, int, int]] = []
    ctx_hits: list[tuple[str, int, int]] = []
    for rel in _iter_source_files():
        lines = read_lines(str(rel))
        if lines is None or len(lines) < span:
            continue
        for i in range(0, len(lines) - span + 1):
            start, end = i + 1, i + span
            block = _sha256(normalize(lines[i : i + span]))
            if block != target_block:
                continue
            block_hits.append((str(rel), start, end))
            ctx_start = max(0, start - 1 - CONTEXT_LINES)
            ctx_end = min(len(lines), end + CONTEXT_LINES)
            ctx = _sha256(normalize(lines[ctx_start:ctx_end]))
            if ctx == target_context:
                ctx_hits.append((str(rel), start, end))
    if len(ctx_hits) == 1:
        return ctx_hits[0]
    if not ctx_hits and len(block_hits) == 1:
        return block_hits[0]
    return None


# --- status ----------------------------------------------------------------

@dataclass
class AnchorStatus:
    anchor: Anchor
    state: str          # "ok" | "moved" | "drift" | "uncached" | "missing"
    detail: str = ""
    moved_to: str = ""  # new key when state == "moved"


def check_anchor(anchor: Anchor, cache: dict) -> AnchorStatus:
    """Classify one anchor against the cache and current code."""
    cached = cache.get(anchor.key)
    current = block_hash(anchor.path, anchor.start, anchor.end)

    # File/range readable right now?
    if current is not None:
        cur_block, cur_ctx = current
        if cached is None:
            return AnchorStatus(anchor, "uncached", "no cache entry; run reconcile to seed it")
        if cur_block == cached.get("hash"):
            return AnchorStatus(anchor, "ok")
        # Content at this location changed. Is it just a move overlapping here?
        # Fall through to relocation using the CACHED hash.

    if cached is None:
        return AnchorStatus(anchor, "uncached", "no cache entry and block unreadable at pinned range")

    span = anchor.end - anchor.start + 1
    moved = find_block_by_hash(cached.get("hash", ""), cached.get("context", ""), span)
    if moved is not None:
        new_key = f"{moved[0]}#L{moved[1]}-L{moved[2]}"
        if new_key == anchor.key:
            # Same place, hash differs → genuine in-place edit.
            return AnchorStatus(anchor, "drift", "block content changed in place")
        return AnchorStatus(anchor, "moved", f"block moved to {new_key}", moved_to=new_key)

    # Cached hash exists nowhere → real change or deletion.
    if current is None:
        return AnchorStatus(anchor, "missing", "file/range gone and block not found elsewhere")
    return AnchorStatus(anchor, "drift", "block content changed and no matching block found elsewhere")


def anchor_to_cache_entry(anchor: Anchor) -> dict | None:
    current = block_hash(anchor.path, anchor.start, anchor.end)
    if current is None:
        return None
    block, ctx = current
    return {
        "hash": block,
        "context": ctx,
        "feature": anchor.feature,
        "label": anchor.label,
        "url": anchor.url,
    }
