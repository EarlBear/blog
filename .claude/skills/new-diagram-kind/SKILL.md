---
name: new-diagram-kind
description: Design and add a new kind of diagram (a new primitive or a new FlowDiagram shape) to the blog's diagram catalog. Use when a post needs a visual no existing component draws — "we need a timeline/tree/matrix diagram", "add a new diagram type", "none of the catalog fits" — or when extending FlowDiagram/UseCaseDiagram with a new shape. Walks the thinking: survey what already exists so you don't duplicate, apply the design criteria, prove it, and keep the catalog a living artifact.
---

# Add a new kind of diagram

Reach for this only when a post genuinely needs a shape the catalog can't draw. A
new primitive is a real commitment — it has to be built, gated, documented, and
maintained — so the first job is to make sure you actually need one.

## 1. Survey what exists first (don't reinvent)

**Read [`../enrich-post/catalog.md`](../enrich-post/catalog.md) before designing
anything.** It is the living list of every technique and the component that draws
it. Then ask, in order:

- Does an existing **technique** already fit? (use-case, pipeline, loop, sequence,
  branch, swimlane, decision/accordion.) If so, use it — stop here.
- Does an existing **component** cover it with a small addition? A new
  `FlowDiagram` **shape** (a new value in its `shape?:` union) is far cheaper than
  a new component, and inherits the whole toolkit (gradients, gates, animation,
  modal, legend). Most "new diagrams" are really a new FlowDiagram shape — start
  there.
- Only if neither fits does a **new component** make sense — a genuinely different
  model (e.g. a matrix/grid, a tree, a timeline with a time axis).

If you're adding a shape, look at how `swimlane` and `branch` were added to
`src/components/FlowDiagram.astro`: a new branch in the geometry block that fills
the `pos` map, an entry in the `svgW`/`svgH` switches, and (if it needs new visual
furniture like lane bands) a small render block + `global.css` styles.

## 2. Design criteria (match the house engine)

Whatever you build must match the existing primitives so the blog stays coherent
and light. Non-negotiable:

- **Build-time inline SVG from a compact spec.** No client JS unless it's
  progressive enhancement (like the click-to-focus modal). No runtime deps, no
  headless browser — see why in `docs/features/diagram-catalog.md` (the Mermaid
  decision).
- **Semantic tokens only** — `--color-*`, `--eb-data-*`, spacing/radius tokens.
  Never raw hex, no dark mode. Single light theme.
- **Deterministic layout** — no `Math.random`, no measuring; the same spec must
  produce the same SVG every build.
- **A blocking quality gate** — a diagram that can't be read cleanly should fail
  the build with an actionable message (mirror the overlap gate: compute crossings
  / legibility, `throw` past a threshold, with an `allowOverlap` escape hatch).
- **Reduced-motion safe** — any animation wrapped in
  `@media (prefers-reduced-motion: reduce)` → final state.
- **Mobile-first** — scales via `viewBox`; wraps in an `overflow-x:auto` scroller
  so it never forces the page to scroll sideways.
- Reuse the shared machinery: the content-quality gates (dangling ref, disconnected
  node, label overflow, a11y `desc`), the modal script pattern, the `legend`.

## 3. Prove it

- Build a throwaway `src/pages/bench/<name>.astro` (dev-only, `import.meta.env.PROD`
  guard) that exercises the new kind, `npm run dev`, and **screenshot it** with
  headless Chrome on desktop and a narrow width. Look at it.
- Confirm the quality gate fires: feed it a deliberately bad spec and check it
  throws with a clear message.
- Then enrich a **real post** with it as the proof — a new kind earns its place by
  making an actual post clearer, not by existing.
- Delete the bench page.

## 4. Keep the catalog a living artifact

This is the step that's easy to skip and mustn't be:

- **Add a row to [`../enrich-post/catalog.md`](../enrich-post/catalog.md)**:
  technique · when to use · component/shape · authored-as · example post. If it
  closed a "known gap," remove it from that list.
- A **`catalog-check`** hook (`npm run catalog-check`, in `make check`, and a
  PostToolUse hook) fails-soft when a diagram component or a `FlowDiagram` shape
  isn't mentioned in the catalog — so drift gets flagged. Treat its warning as a
  to-do, not noise.
- If it's a new **component** (not just a shape), reconcile
  `docs/features/diagram-catalog.md` via the `feature-docs` skill so the "why" is
  recorded.

## Notes

- One strong, well-gated kind beats three half-built ones. If you can't state in a
  sentence when a reader should reach for this shape over the existing ones, it
  probably isn't a distinct kind yet.
- The whole diagram system is zero-dependency by design; a new kind that needs a
  library is a decision to raise with the user, not to make silently — it cuts
  against the repo's deliberate light-build ethos.
