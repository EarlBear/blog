# Feature docs — the "why"

Each file here explains **why a feature exists** and links the exact code blocks
that implement it. The goal: intent stays discoverable, and we get a signal when
the code behind a rationale changes so the "why" doesn't silently rot.

One doc per user-facing capability (e.g. `rss-feed.md`, `tags.md`,
`syntax-highlighting.md`). The filename stem is the **feature id**.

## Format

```markdown
# <Feature name>

## Why
<Why this exists — the problem it solves, the decision behind it, tradeoffs.
This is the durable rationale, written for someone who wasn't here.>

## Code
- https://github.com/EarlBear/blog/blob/<sha>/<path>#L<start>-L<end> — <label>
- https://github.com/EarlBear/blog/blob/<sha>/<path>#L<start>-L<end> — <label>

## Notes
<Optional: gotchas, links to related features [[other-feature]], future work.>
```

Anchors are **GitHub blob permalinks**: `path + commitId + line range`. They are
clickable (open the exact code as it was when documented) and carry provenance
via the commit id.

## Drift detection (content-hash, rename-proof)

A cache at `.anchors.json` stores a **normalized content hash** per anchor,
keyed by `path#L<start>-L<end>`. To check drift we recompute the current block's
hash and compare — not a text diff, so formatting-only edits don't trip it.

Because detection is content-addressed, anchors **survive renames and
line-shifts**: if the cached hash isn't found at the pinned location, the tools
scan the repo for the same hash. Found elsewhere → the block only *moved*, and
the cache/doc are re-keyed silently. Found nowhere → real drift, flagged for
review.

| Situation | Content hash | Handled by |
|---|---|---|
| File renamed / lines shifted | unchanged | tooling auto-heals (re-key), no warning |
| Block content edited in place | changed | flagged as drift → reconcile via the skill |

## Tools

- `npm run features:check` — full sweep: auto-heal moves, report drift (exit 1 if
  any unreviewed drift/missing remains). Good for pre-commit / CI.
- `npm run features:seed` — same sweep but writes current hashes for any
  uncached anchors (use right after authoring a doc).
- **PostToolUse hook** (`.claude/hooks/check-feature-docs.py`) — after an edit,
  silently re-keys moved blocks and warns (never blocks) when a documented block
  drifts.
- **`feature-docs` skill** — author a new doc, or reconcile a stale one. Reconcile
  is the *only* path that re-blesses changed content: it makes you re-read the
  why, then re-pins the anchor's commit id to HEAD and updates the cache.

## Rules

- Never let a hook auto-bless *changed content* — that's a human decision made
  through the skill. Hooks may only re-key blocks whose content is unchanged.
- Keep the "Why" written for a future reader with no context. Link related
  features with `[[feature-id]]`.
