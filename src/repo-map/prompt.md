---
tags: [artifact, internal]
audience: internal
summary: "Interactive Mermaid map of every EarlBear repo and how they interconnect, with a click-through detail drawer per repo."
---

# EarlBear Repo Map — Claude Code Rebuild Prompt

> Copy this entire block into Claude Code. It is a complete self-contained specification for rebuilding the `repo-map` artifact from scratch. No prior context required.

---

## Mission

Build a **single-file HTML application** that visualizes the entire EarlBear
multi-repo ecosystem as one interactive diagram:

- A **Mermaid flowchart** of every `earlbear-*` repository, grouped into subgraphs
  by role, with directed edges showing how they depend on / publish to / sync with
  each other.
- **Clicking any node opens a custom side-drawer** with that repo's purpose, stack,
  GitHub remote, and its inbound/outbound interconnections. Each interconnection in
  the drawer is itself clickable to re-focus the drawer on the connected repo.

The audience is **internal** (engineers onboarding to the ecosystem or reasoning
about cross-repo impact). It is a gated gallery artifact (`audience: internal`).

## Hard constraints (match the gallery pipeline)

- **One self-contained HTML file**, `claude-artifacts/repo-map/artifact.html`.
- **Vanilla JS only — no React, no JSX, no `type="text/babel"`.** The dist pipeline's
  `scripts/compile-babel-artifacts.sh` only rewrites files that contain a
  `type="text/babel"` block; a plain-JS artifact passes through untouched, which
  removes the single biggest source of build fragility. Mermaid node-click callbacks
  are pure DOM, so React buys nothing here.
- **Design System tokens only**, via `<link rel="stylesheet" href="../earlbear-tokens.css">`.
  Use `var(--fs-*)`, `var(--fw-*)`, `var(--ls-*)`, `var(--eb-*)`, `var(--dur-*)`,
  `var(--ease-*)`. No raw px font sizes, no hand-rolled hex for signal/data colors.
  IBM Plex Sans / Mono from Google Fonts. The page is light ("warm paper": `--eb-ivory`).
- **Mermaid via CDN**: `https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.6.1/mermaid.min.js`
  (same version already used by `shopscan-vision`).

## Data model (baked in)

All repo data lives as JS objects at the top of the `<script>` block — there is no
runtime fetch. Three structures:

1. `GROUPS` — `{ key: { label, color } }`. Six groups:
   `frontend` (Frontend & Assets), `shopify` (Shopify), `cli` (CLIs & Agent),
   `ops` (Content & Ops), `dist` (Distribution), `plugins` (Plugins & Skills).
   Each `color` is the saturated group hue; node fills are a paper-tinted version
   (see `tint()`).

2. `REPOS` — keyed by repo slug (e.g. `"earlbear-sites"`). Each value:
   `{ icon, group, remote, stack: string[], purpose: string }`.
   `remote` is the `org/name` GitHub path, or `"(local only)"` for un-pushed repos.

3. `EDGES` — array of `{ from, to, kind, reason }`.
   `kind: "dep"` renders a **solid** arrow (build/runtime dependency);
   `kind: "flow"` renders a **dotted** arrow (sync / publish / distribution).
   `reason` is the one-line explanation shown in the drawer's edge list.

The current inventory covers 15 repos and 18 edges. Keep the data accurate by
regenerating it with the **`manage-repo-map`** skill (scans sibling `earlbear-*`
repos and diffs the embedded data) rather than hand-editing in place.

## Diagram build

- `buildGraph()` emits a `flowchart LR` Mermaid definition: one `subgraph` per group,
  each repo a node labelled `icon + slug-without-earlbear-prefix`, edges with
  `-->` (dep) or `-.->` (flow), per-group `classDef` for the tinted fill + group-color
  stroke, and a `click <nodeId> call rmSelect("<slug>")` binding per node.
- `nodeId(slug)` = `"n_" + slug.replace(/-/g,"_")` (Mermaid-safe id).
- `tint(hex)` mixes a group color 84% toward paper (`#FBF9F5`) for the node fill.
- Initialize Mermaid with `startOnLoad:false`, `securityLevel:"loose"` (required so
  `click ... call` fires the global handler), `theme:"base"` with paper-toned
  `themeVariables`, then `await mermaid.render(...)` and inject the SVG. Call
  `out.bindFunctions(el)` so the click bindings attach.

## Detail drawer

- Right-side `.drawer` + `.scrim`, opened by `rmSelect(slug)` which is assigned to
  `window.rmSelect` (Mermaid's `call` resolves the handler on `window`).
- Populates: icon, slug, remote (`github.com/<remote>` when pushed), group pill
  colored by group, purpose, stack chips, and two edge lists —
  **Depends on / publishes to** (`edgesOut`) and **Consumed by** (`edgesIn`).
- Each edge row shows the connected repo's icon + name + `reason`, and clicking it
  calls `rmSelect(other)` to re-focus. Empty lists show an italic placeholder.
- `highlightNode(slug)` adds an `.rm-active` class (Terra stroke) to the matching
  SVG node. Close via the ✕ button, scrim click, or Escape.

## Legend & footnote

- A toolbar above the diagram renders one legend swatch per group (tinted fill +
  group-color border) and a "click a node" hint.
- A footnote notes this is a snapshot of `~/Workspace/git/earlbear-*`, explains the
  solid-vs-dotted edge convention, and points at the `manage-repo-map` skill for
  regeneration.

## Verify

Serve `claude-artifacts/` over HTTP (so `../earlbear-tokens.css` resolves) and open
`/repo-map/artifact.html`. Confirm: diagram renders with no console errors, clicking
a node opens the drawer with correct detail, and clicking an edge row re-focuses the
drawer. Do **not** deploy — `make publish-cf` is owner-gated.
