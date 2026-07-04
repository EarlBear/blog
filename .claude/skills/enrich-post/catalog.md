# Diagram catalog

The techniques available for enriching a post, and which component renders each.
This is a **living catalog** — every time we add a diagram primitive, it gets a row
here so the next enrichment can find it. The `enrich-post` skill reads this to pick
a technique.

## Techniques

| technique | when to use | component | authored as | example post |
|---|---|---|---|---|
| **use case** | who does what to a system (actors + oval use cases) | `UseCaseDiagram` | native spec (actors/useCases/links) | `earlbear-use-cases` |
| **pipeline** | linear A → B → C data or handoff flow | `FlowDiagram shape="pipeline"` | native spec **or** `mermaid` string | `mining-...-transcripts` |
| **loop** | a cycle whose last step feeds the first (flywheel) | `FlowDiagram` (auto-detected from a back-edge, or `shape="loop"`) | native spec **or** `mermaid` | `agentic-workflow-...` |
| **architecture / boundary** | what runs where; what crosses a trust line | `FlowDiagram` with `kind: 'edge' \| 'store' \| 'external'` nodes | native spec | `from-one-laptop-...` |
| **sequence / steps** | ordered vertical steps | `FlowDiagram shape="sequence"` (or `mermaid` with `TB`/`TD`) | native spec **or** `mermaid` | — |
| **decision / options** | weigh options toward a choice | `Accordion` (+ optional `FlowDiagram` for the flow) | native spec (items with `verdict`) | `one-database-two-modes` |

## The Mermaid decision rule (why we parse, not render)

The blog offers **"our own extended Mermaid"**: authors write the Mermaid flowchart
syntax they know, and `src/components/diagram/mermaid-parse.ts` converts it into
`FlowDiagram` nodes/edges, rendered by our own build-time SVG engine.

**Why not render real Mermaid?** Verified, not assumed:

- `mermaid-isomorphic` / `mermaid-ssr` / any Node Mermaid *renderer* needs a real
  browser DOM — Mermaid's layout calls `getBBox` / `getBoundingClientRect`, which
  `jsdom`/`svgdom` don't implement. Tested on Node 20 **and** 22: all fail
  (`CSSStyleSheet is not defined`, then `Only implemented for SVG Elements`).
- The only reliable Mermaid-render paths are **Playwright at build** (~300MB browser
  dep — rejected by the repo's light-build ethos) or **client-side mermaid.js**
  (~500KB JS per page — breaks the zero-JS baseline).
- `@rendermaid/core` (a "pure-TS renderer") does not exist on npm (404).

So we **parse** the flowchart grammar (small and stable) and render with our engine.
This keeps the syntax people know, our theme/gates/animation underneath, and adds
**no dependency, no browser, no Node upgrade**.

### What the parser covers

`mermaid-parse.ts` handles the flowchart subset:

- header: `flowchart LR` / `graph TD` (direction `LR TB TD BT RL`)
- node shapes: `A[rect]`, `A(round)`, `A([stadium])`, `A[(store)]`, `A{decision}`,
  `A((circle))` — `[(...)]` maps to a datastore (`kind: 'store'`)
- edges: `-->`, `---`, `-.->`, `==>` with `|label|` or `-- label -->`
- chained edges (`A --> B --> C`), `%%` comments, blank lines
- a back-edge to an earlier node auto-renders as a **loop**

Not covered (use the native spec, or another technique): subgraphs, class/style
directives, click handlers, sequence/state/gantt/other Mermaid diagram types, and
the `kind: 'edge'`/`'external'` node hints (set those via the native spec).

## Quality gates (shared by the SVG primitives)

`FlowDiagram` and `UseCaseDiagram` both run **blocking build-time gates**: a diagram
whose lines cross too much (<75% crossing-free), or whose actors fan too lopsidedly,
fails the build with an actionable message. `allowOverlap` downgrades them to
warnings — use it only when a fan-out genuinely can't be linear, and say why.

## Adding a technique

New shape → build a primitive like the others (build-time inline SVG, semantic
tokens, a layout gate, reduced-motion animation), then **add a row to the table
above** and, if it's a component, a `docs/features/` entry via `feature-docs`. Keep
this file the single place the catalog grows.
