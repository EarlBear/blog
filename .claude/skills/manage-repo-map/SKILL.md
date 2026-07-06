---
name: manage-repo-map
description: Keep the "Repo Map" internal page's embedded data in sync with the real EarlBear ecosystem. Scans the sibling earlbear-* repos (git remotes + package.json file: deps), parses the REPOS/EDGES baked into src/repo-map/artifact.html (served by src/pages/repo-map.astro on the internal blog), and reports structural drift — new/removed repos, changed remotes, and file: dependency edges that appeared or disappeared. It does NOT rewrite the artifact: structural drift becomes a checklist for a human (or Claude) to fold in by hand, because each repo's purpose and each edge's reason is curated prose. Use after a repo is added/removed/renamed, or before deploying the internal blog, to confirm the map is accurate.
allowed-tools: Bash(node *), Bash(make *), Read, Edit, Glob
type: user-invocable
---

# manage-repo-map

The **Repo Map** (`src/repo-map/artifact.html`, served internal-only by
`src/pages/repo-map.astro` at `/repo-map/`) is a Mermaid diagram of every EarlBear
repository and how they interconnect, with a click-through detail drawer per repo. It was
ported from `earlbear-sites/claude-artifacts/repo-map/`; this blog copy is now canonical.
Its data lives in three JS literals baked into the artifact:
`REPOS` (slug → icon/group/remote/stack/purpose), `EDGES` (directed `{from,to,kind,reason}`),
and `IGNORE_REPOS` (sibling dirs that intentionally get no node).

That data rots as the ecosystem grows. This skill keeps it **honest** by diffing the
embedded data against a live scan of the sibling repos.

## When to trigger

- "is the repo map still accurate?" / "check the repo map for drift"
- after adding, removing, or renaming an `earlbear-*` repo
- after adding a new `@earlbear/*` `file:` dependency between repos
- before `make deploy-internal`, as a pre-flight accuracy check on the map

## What it verifies (and what it can't)

The **structure** is mechanically scannable, so the skill auto-checks it:

| Checked | How |
|---|---|
| New repos on disk, missing from the map | `earlbear-*` dirs under the scan root vs. `REPOS` keys |
| Removed repos (in the map, gone on disk) | `REPOS` keys vs. scanned dirs |
| Changed git remotes | `git remote get-url origin` vs. each repo's `remote` (normalized to `org/name`) |
| New `file:` dependency edges | `file:` specs in every `package.json` vs. `kind:"dep"` edges |
| Stale `dep` edges | `kind:"dep"` edges no longer backed by a `file:` dep on disk |

The **prose** is NOT regeneratable and is never touched:

- Each repo's `purpose` and `stack`, and each edge's `reason`, are hand-authored.
- `flow` edges (sync / publish / shared-infra relationships, the dotted arrows) are
  prose-derived — they have no on-disk signal, so the scanner never flags them. Review
  them by eye when the report shows other drift.

This is **`git status`, not `git add`**: the script reports a checklist; you fold the
changes into `src/repo-map/artifact.html` by hand so the curated prose is preserved.

## Run it

```
make repo-map-check
# or directly:
node .claude/skills/manage-repo-map/scripts/scan-repos.mjs [--root <dir>] [--artifact <path>] [--json]
```

- `--root <dir>` — directory holding the `earlbear-*` siblings (default: the parent of
  the repo root, i.e. `~/Workspace/git-earlbear`).
- `--artifact <path>` — path to the artifact (default: `src/repo-map/artifact.html`).
- `--json` — emit the machine-readable diff instead of the human report.

Exit: `0` no drift · `1` drift found · `2` usage/IO error. The non-zero-on-drift exit
makes it usable as a pre-publish gate.

## Folding drift back in (by hand)

1. **New repo** → add a `REPOS["earlbear-<x>"]` entry: pick an `icon`, assign a `group`
   (one of the `GROUPS` keys), set `remote`, list `stack`, and write a one-line `purpose`
   from the repo's README/CLAUDE.md. Add any real edges.
2. **Removed repo** → delete its `REPOS` entry and every `EDGES` row referencing it.
3. **Changed remote** → update that repo's `remote` field.
4. **New `dep` edge** → add `{ from, to, kind: "dep", reason: "<the file: dep>" }`.
   Solid arrow = a real build-time `file:` dependency, nothing else.
5. **Stale `dep` edge** → either the dep was removed (delete the edge) or it was never a
   `file:` dep and should be `kind: "flow"` (dotted) instead.
6. **Intentional non-node** (a local alias, a non-repo dir) → add its dir name to
   `IGNORE_REPOS` so it stops being reported as "new".

Re-run `make repo-map-check` until it reports `✓ in sync`.

## Tests

```
node .claude/skills/manage-repo-map/scripts/test_scan_repos.mjs
```

19 node:test cases (TAP) over the pure core: `parseEmbeddedData` (REPOS/EDGES/IGNORE_REPOS
extraction), `jsObjectToJson` (bare keys, single quotes, trailing commas, comments),
`detectFileDeps` / `fileDepEdges` (file: resolution, dedupe, self-edge drop),
`normRemote`, and `diffMap` (new/removed repos, remote changes, new/stale dep edges,
flow-edges-ignored, IGNORE_REPOS). Rely on exit code.

## Deploy

This skill only edits `src/repo-map/artifact.html` (source). The page ships to the
internal blog with the normal internal build/deploy — it is **internal-only** and
self-guarded to 404 on the external build (`src/pages/repo-map.astro`):

```
make deploy-internal   # PUBLIC_AUDIENCE=internal build → Cloudflare Pages (CF Access-gated)
```

The map never appears on the public site. See `docs/features/audience-split.md` and the
`deploy` skill for the guided internal deploy.

## Related

| Skill | Relationship |
|---|---|
| `deploy` | The guided internal/external blog deploy; run `make repo-map-check` before deploying the internal build. |
| `audience-audit` | Judges whether a post's declared audience fits its content; this artifact is fixed `internal` and served outside the post pipeline. |
| `enrich-post` / `new-diagram-kind` | The blog's native diagram path (`FlowDiagram` over `@earlbear/ui/diagram`). The repo-map is instead a vendored self-contained artifact — its 6 subgraphs have no native `FlowDiagram` shape (yet). |
