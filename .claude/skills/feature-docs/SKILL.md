---
name: feature-docs
description: Author or reconcile a docs/features/ "why" doc for this blog. Use when adding a feature (capture why it exists + link the code that implements it), when the feature-docs hook or `npm run features:check` reports drift, or when the user says "document why", "write a feature doc", "reconcile the why-docs", or "why does <feature> exist". Anchors are GitHub permalinks; drift is content-hash based and rename-proof.
---

# Feature docs — author & reconcile

Feature docs live in `docs/features/<id>.md` and explain **why** a feature exists,
linking the exact code blocks that implement it. Drift detection is content-hash
based (see `docs/features/README.md` and `scripts/features_lib.py`). This skill is
the human-in-the-loop path for the two operations a hook must never do on its
own: **authoring** a rationale, and **reconciling** real drift.

## Guardrails

- **Reconciling is the ONLY way to re-bless changed content.** Never edit
  `.anchors.json` by hand to silence drift — that defeats the point. Re-read the
  why first; only then re-pin.
- A move/line-shift (content unchanged) is NOT drift — the tooling auto-heals it.
  You only reconcile when content actually changed and the why needs a look.
- Keep the "Why" written for a future reader with no context.

## Authoring a new feature doc

1. **Name it.** One doc per user-facing capability. `id` = kebab filename stem
   (e.g. `rss-feed`, `tags`, `syntax-highlighting`).

2. **Write the why.** Create `docs/features/<id>.md` following the format in
   `docs/features/README.md`:
   - `## Why` — the problem, the decision, the tradeoffs. Durable prose.
   - `## Code` — one bullet per code block, as a GitHub permalink anchor.
   - `## Notes` — optional gotchas, `[[related-feature]]` links.

3. **Build each anchor.** For a block at `<path>` lines `<start>`–`<end>`:
   - Get the current commit sha: `git rev-parse --short HEAD`.
   - Confirm the range with the current file (line numbers must bracket exactly
     the block you mean — read the file, don't guess).
   - Format:
     `https://github.com/EarlBear/blog/blob/<sha>/<path>#L<start>-L<end> — <label>`

4. **Seed the cache.** `npm run features:seed` — writes the current normalized
   hash for every uncached anchor. Then `npm run features:check` must report all
   `ok`.

## Reconciling drift

Triggered when `npm run features:check` or the PostToolUse hook reports `DRIFT`
for a feature.

1. **Read the why.** Open `docs/features/<id>.md` and read its `## Why`. This is
   the whole point — decide whether the rationale still holds now that the code
   changed.

2. **Look at the current code** at the drifted anchor. Three outcomes:
   - **Why still holds, code just evolved** → keep the prose, re-pin (step 3).
   - **Why changed** → rewrite `## Why` to match reality, then re-pin.
   - **Feature removed** → delete the anchor (or the whole doc if the feature is
     gone), and its cache entries.

3. **Re-pin the anchor(s):**
   - Update each anchor's line range to the block's current lines.
   - Update the anchor's commit sha to current HEAD (`git rev-parse --short HEAD`).
   - Re-seed: `npm run features:seed` (writes the new hash into `.anchors.json`).

4. **Verify.** `npm run features:check` reports all `ok` and exits 0.

5. If you tracked this as a "Review why-doc: <id>" task, mark it completed.

## Notes

- The engine ignores `node_modules`, `dist`, `.astro`, `.git` when relocating
  blocks (`scripts/features_lib.py` → `SCAN_IGNORE_DIRS`).
- Formatting-only edits (whitespace, blank-line runs) are normalized out and do
  NOT cause drift.
- Two byte-identical blocks are disambiguated by surrounding context lines; if a
  move is ambiguous, the tooling reports drift rather than guess — re-pin by hand.
