# Plan: enrich posts with diagrams + an enrich-post skill + a growing diagram catalog

## Context

Only 2 of our 10 posts carry any visual: `life-without-earlbear.md` (bespoke inline
charts) and `earlbear-use-cases.mdx` (the new `UseCaseDiagram`). The other 8 are
text-only, yet several are architecture/pipeline/loop posts that *beg* for a
diagram. We have exactly **one** diagram primitive, so enriching posts means
**growing a catalog of diagramming techniques**, capturing the *process* as a
repeatable **`enrich-post` skill**, and enriching a first batch as proof.

The repo's diagram engine philosophy (from `docs/features/usecase-diagrams.md`):
build-time inline SVG from a compact spec, semantic tokens only, deterministic
layout, reduced-motion animation, and **blocking layout-quality gates**. We extend
that — and, per the user, we now also lean on **Mermaid where it overlaps**, in a
light-build, EarlBear-themed form ("our own extended Mermaid").

**Decisions locked with the user:**
- Build the `enrich-post` skill **and** grow the primitive catalog (not one or the
  other).
- New primitives mirror `UseCaseDiagram` exactly (build-time SVG, tokens, gates).
- The catalog lives **inside the skill's subdirectory** (a reference file), not a
  top-level `docs/` doc — the skill reads it to pick a technique; new primitives
  add rows.
- **Mermaid decision rule:** use themed Mermaid where its mature layout engine wins
  (complex flowchart, sequence, state); use our zero-dep primitives where Mermaid
  is weak or absent (use-case, simple pipeline/loop, accordion, anything needing
  the Earl-mark actor). The skill encodes when to pick which.
- Also add a **foldable/accordion** primitive for presenting options (decision
  posts).
- First proof batch: **all 4** — `agentic-workflow` (loop), `mining-transcripts`
  (pipeline), `from-one-laptop-to-the-cloud` (architecture), `one-database-two-modes`
  (decision).

### Mermaid research (why the rule, not all-or-nothing)

Pure-JS build-time Mermaid **is** possible via **`isomorphic-mermaid`** (tani) —
it wires `svgdom`+`jsdom`+`dompurify` so `mermaid.render()` runs in Node with **no
headless browser** (unlike `mermaid-isomorphic`/`remark-mermaidjs`, which need
Playwright — the reason we rejected Mermaid originally). Its extension seams are
`themeVariables` (inject EarlBear semantic tokens) + `themeCSS` (our gradients,
animation, pseudo-classes) — that *is* "our own extended Mermaid," via theming, not
a renderer fork. Caveat driving the *rule*: it's a **niche 13-star dep** bundling
mermaid (~500KB) + jsdom + svgdom — real weight against this repo's
zero-dep/vendored ethos. So we add it, but reach for it only where it clearly beats
reinventing a layout engine; a tiny bespoke SVG still wins for simple shapes.

---

## Deliverables

### 1. `FlowDiagram` primitive (zero-dep, mirrors UseCaseDiagram)

`src/components/FlowDiagram.astro` (+ helpers under `src/components/diagram/`).
Covers the common directed shapes Mermaid would be overkill for:

- **`shape="pipeline"`** — a horizontal A→B→C→D flow (mining-transcripts).
- **`shape="loop"`** — a cycle where the last node feeds the first (agentic-workflow).
- **`shape="sequence"`** — a vertical stepped flow.

Spec mirrors UseCaseDiagram's shape:
```ts
interface FlowNode { id: string; label: string; kind?: 'default'|'edge'|'store'|'external'; detail?: string; }
interface FlowEdge { from: string; to: string; label?: string; }
interface Props { title: string; desc?: string; shape: 'pipeline'|'loop'|'sequence'; nodes: FlowNode[]; edges: FlowEdge[]; allowOverlap?: boolean; }
```
Reuses the UseCaseDiagram toolkit: build-time inline SVG, `--eb-data-*` gradient
fills, the segment-crossing math + **blocking overlap gate**, reduced-motion
draw-in animation, and the **click-to-focus modal** (progressive enhancement) for
node `detail`. A `kind="edge"` node renders a trust-boundary/edge marker (for
"sanitize at the edge").

### 2. `Accordion` component (foldable options)

`src/components/Accordion.astro` — a native `<details>/<summary>` foldable list,
zero JS, design-system styled. For decision posts: each option is a fold with a
one-line summary and expandable detail (forces, trade-offs). Semantic-token
styling in `global.css` (`.eb-accordion`), keyboard-accessible by default via
`<details>`.

### 3. Themed Mermaid ("our extended Mermaid")

- Add **`isomorphic-mermaid`** (public dep; no Playwright). Wrap it in
  `src/components/MermaidDiagram.astro`: takes a mermaid code string (or a fenced
  ```mermaid``` block), renders to inline SVG **at build time**, injecting an
  EarlBear theme — `themeVariables` mapped from our tokens (accent, surface, text,
  borders) + `themeCSS` for the warm gradients/animation and `prefers-reduced-motion`.
- One shared theme module `src/components/diagram/mermaid-theme.ts` so every
  Mermaid diagram is on-brand without per-diagram config.
- Guard: if the dep or render fails, fail the build with a clear message (don't
  ship an empty diagram). Verify the emitted SVG uses our tokens, not Mermaid
  defaults.
- Use it in a post where its layout wins (candidate: the sequence/state in
  `syncing-append-only-transcripts` "the rewind", or a genuinely branchy flow) —
  at least one proof that the themed-Mermaid path works end to end.

### 4. `enrich-post` skill + catalog

`.claude/skills/enrich-post/SKILL.md` — the repeatable process:
1. Read the post; find each place a diagram would carry meaning the prose can't
   (a flow, a cycle, a boundary, a decision, a "who does what").
2. Pick a technique from the **catalog** (below) using the **decision table**
   (Mermaid vs. ours).
3. Author it (`.md`→`.mdx` if embedding a component), keep house voice, wire any
   `detail`/accordion copy.
4. Verify: `npm run dev` and **look at it**, `npm run posts-check`, `npm run build`
   (the layout gates run here).

`.claude/skills/enrich-post/catalog.md` — the **living catalog** that compounds.
One row per technique:

| technique | when to use | renderer | Mermaid or ours | example post |
|---|---|---|---|---|
| use-case | who does what to a system | `UseCaseDiagram` | ours | earlbear-use-cases |
| pipeline | linear A→B→C data/handoff flow | `FlowDiagram shape=pipeline` | ours | mining-transcripts |
| loop | cyclic process that feeds back | `FlowDiagram shape=loop` | ours | agentic-workflow |
| architecture / boundary | what runs where, what crosses a trust line | `FlowDiagram` (+edge nodes) | ours | from-one-laptop |
| decision / options | weigh options → a choice | `Accordion` (+ optional flow) | ours | one-database-two-modes |
| sequence / state | ordered interactions, state changes | `MermaidDiagram` | Mermaid | syncing-transcripts |
| complex flowchart | branchy graph a layout engine should place | `MermaidDiagram` | Mermaid | (future) |

New primitives/techniques **add a row here** — that is how the catalog grows.

### 5. Enrich the 4 proof posts

- `agentic-workflow-that-runs-earlbear` → `FlowDiagram shape="loop"` (Scan→Outreach→Onboard→Review→back).
- `mining-our-own-claude-code-transcripts` → `FlowDiagram shape="pipeline"` (JSONL→sanitize@edge→Supabase→dashboard).
- `from-one-laptop-to-the-cloud` → `FlowDiagram` architecture/boundary (raw stays on laptop; derived → cloud).
- `one-database-two-modes` → `Accordion` of the options (+ a small decision flow if it reads better).
- Each becomes `.mdx` (import the component); voice preserved; a prose line points at the visual.

### 6. Docs + wiring

- `docs/features/` why-doc for the diagram catalog / FlowDiagram / themed-Mermaid
  (via `feature-docs`), recording the Mermaid decision rule.
- Update `new-post` skill: its existing (dangling) reference to a `dataviz` skill
  and its charts section should point at `enrich-post` + the catalog.
- Add the new skills to CLAUDE.md's skill list. Track everything as Tasks and in
  `docs/tasks/`.

---

## Critical files

- **New:** `src/components/FlowDiagram.astro`, `src/components/Accordion.astro`,
  `src/components/MermaidDiagram.astro`, `src/components/diagram/mermaid-theme.ts`,
  `.claude/skills/enrich-post/SKILL.md`, `.claude/skills/enrich-post/catalog.md`,
  `docs/features/diagram-catalog.md`.
- **Reuse (don't reinvent):** `src/components/UseCaseDiagram.astro` — its inline-SVG
  pattern, `--eb-data-*` gradients, segment-crossing gate, barycenter placement, and
  the modal script are the template for `FlowDiagram`. `src/components/diagram/actors.ts`
  (inline-SVG-from-disk helper). `src/styles/global.css` `.usecase-diagram` block
  (mirror for `.flow-diagram`, `.eb-accordion`, `.mermaid-diagram`).
- **Edit:** `astro.config.mjs` (already has mdx), `package.json` (+isomorphic-mermaid),
  the 4 posts (→.mdx), `new-post` SKILL, `CLAUDE.md`, `docs/tasks/*`.

## Verification

1. **Light build holds:** `npm run build` green; only public deps added
   (`isomorphic-mermaid`); **no Playwright/browser** pulled in (`npm ls playwright`
   empty). Note the added weight in the feature doc honestly.
2. **Each primitive renders + passes its gates:** `npm run dev`, open each of the 4
   posts, screenshot via headless Chrome (the established flow) on desktop + mobile;
   confirm FlowDiagram loop/pipeline/architecture read cleanly and pass the overlap
   gate; Accordion folds/unfolds with keyboard; Mermaid diagram is EarlBear-themed
   (tokens, not Mermaid defaults) and reduced-motion-safe.
3. **Governance:** `npm run posts-check`, `npm run tasks-check`, `make features-check`
   all pass; the 4 posts still meet voice + questions rules as `.mdx`.
4. **Skill loop:** run `/enrich-post` against a 5th post end-to-end to prove the
   process + catalog actually guide the work.

## Out of scope / non-goals

- No headless-browser Mermaid (Playwright) — the whole point of the light-build path.
- Not converting `life-without-earlbear`'s bespoke charts to a primitive (works; leave it).
- Dark mode (single light theme, deliberately).
- Enriching all 8 posts now — 4 proofs + the skill; the rest follow via `/enrich-post`.
