# Diagram catalog (FlowDiagram, Accordion, extended Mermaid)

## Why

Most posts were text-only, yet many describe structures — pipelines, loops,
architectures, decisions — that a diagram conveys far better than prose. We had
exactly one diagram primitive (`UseCaseDiagram`), so enriching posts meant *growing
a catalog* of reusable, on-brand diagram components and capturing the process as a
repeatable skill (`enrich-post`). This feature is that catalog's second and third
primitives plus the "diagrams as code, our way" path.

**Design constraint (inherited):** build-time inline SVG from a compact spec,
semantic tokens only, deterministic layout, reduced-motion animation, and blocking
layout-quality gates — the same philosophy as `usecase-diagrams`. Zero runtime
dependencies; no client JS unless a diagram opts into the detail modal.

### The Mermaid decision (verified, not assumed)

The ask was to lean on Mermaid where it overlaps — "our own extended Mermaid." We
tested whether Mermaid can render at build time without a browser, because that is
the only way it fits this repo:

- Every Node Mermaid **renderer** (`mermaid-isomorphic`, `mermaid-ssr`, etc.) needs
  a real browser DOM — Mermaid's layout calls `getBBox`/`getBoundingClientRect`,
  which `jsdom`/`svgdom` don't implement. Tested on Node 20 **and** Node 22: all
  fail (`CSSStyleSheet is not defined`, then `Only implemented for SVG Elements`).
- The reliable Mermaid paths are Playwright-at-build (~300MB browser dep — rejected)
  or client-side `mermaid.js` (~500KB/page — breaks the zero-JS baseline).
- The official `@mermaid-js/parser` doesn't cover flowchart; `@rendermaid/core`
  (a claimed pure-TS renderer) doesn't exist on npm.

**Resolution:** we don't render Mermaid — we **parse** its flowchart grammar (small,
stable) and render the result with our own engine. Authors write the Mermaid syntax
they know; our zero-dep SVG engine draws it with our theme, gates, and animation.
That is the whole "extended Mermaid" idea, with no dependency, no browser, no Node
upgrade. The full decision rule and parser scope live in the `enrich-post` skill's
`catalog.md`.

## Code
<!-- Anchors seeded post-commit via feature-docs / `npm run features:seed`. -->
- src/components/FlowDiagram.astro — pipeline/loop/sequence flows; gradient nodes; blocking overlap gate; draw-in animation; click-to-focus modal; accepts a native spec or a Mermaid string
- src/components/diagram/mermaid-parse.ts — zero-dep parser for the Mermaid flowchart subset → FlowDiagram nodes/edges
- src/components/Accordion.astro — native `<details>`/`<summary>` foldable option list (decision posts), zero JS
- src/styles/global.css — `.flow-diagram` and `.eb-accordion` styling + animation (reduced-motion safe)
- .claude/skills/enrich-post/SKILL.md + catalog.md — the enrich process and the living technique catalog

## Notes

- Proof posts, one per technique: `agentic-workflow-...` (loop),
  `mining-...-transcripts` (pipeline, `edge` trust-boundary node),
  `from-one-laptop-...` (architecture/boundary), `one-database-two-modes`
  (decision/accordion). Each was converted `.md` → `.mdx` to embed the component.
- The overlap gate and reduced-motion handling are shared in spirit with
  [[usecase-diagrams]] — same crossing math, same `allowOverlap` escape hatch.
- The catalog is designed to compound: new shapes add a primitive plus a row in
  `catalog.md`. See the `enrich-post` skill.
