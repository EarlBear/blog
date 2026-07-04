# Use-case diagrams (build-time SVG)

## Why

We needed to draw EarlBear's use cases — who uses the product (internal
operators, external customers, an automated scheduler) and what each does — in
the one UML notation built for that question: the use-case diagram (actors
outside a system boundary, oval use cases inside, association / «include» /
«extend» relationships).

**Why a hand-rolled component instead of an existing engine.** We evaluated the
"diagrams as code" landscape against two hard requirements: keep the build light
(no headless browser, no CI, minimal deps — this repo deliberately runs without
Actions and vendors its design system rather than installing it) *and* produce
the desired effect (oval UML use cases, the **Earl monogram as the actor**,
design-system gradients, animation). No off-the-shelf tool cleared both bars:

- **Mermaid** still has no use-case diagram type (an unmerged, in-progress PR),
  and its build-time rendering wants Playwright — a ~300MB browser dependency we
  keep out of this repo on purpose. Its pure-JS renderers still can't embed our
  Earl mark or do gradient ovals.
- **D2** has `oval` and `person` shapes, but requires a Go binary on every build
  host (reintroducing the toolchain dependency we avoid), exposes no gradient
  fills, limits animation to connectors, and can't tint the Earl monogram.
- **Kroki** needs a network call or a self-hosted server at build time.

So we drew our own. The repo already inlines SVG at build time in
`src/components/EarlMark.astro` (read the asset, strip its hardcoded color so
`currentColor` tinting works) and the vendored `earl-mark.svg` already uses an
SVG gradient — so a small component that emits one inline `<svg>` from a compact
declarative spec is directly in-grain and adds **zero build weight, zero client
JS, and no dependency**. It honors the UML spec, speaks the design system
natively (semantic tokens only), and animates on load with a reduced-motion
fallback.

The trade-off: it is a use-case-diagram engine, not a general one. If we later
want more diagram types, the spec (`actors` / `useCases` / `links`) is the seam
to extend — or we revisit an engine once one clears both bars.

## Evidence

The two contested decisions — **inline SVG over an exported image**, and
**shipping the animation** — are backed by measurement, not taste. A repeatable
harness (`scripts/diagram-bench.mjs`, `make bench-diagram`) renders the *same*
diagram three ways and measures each on desktop + mobile via headless Chrome. The
full table lives in [`docs/diagram-bench.md`](../diagram-bench.md); the decisive
findings:

- **Weight:** the whole HTML document *including* the inline SVG diagram is
  ~55 KB — **lighter than the equivalent PNG of the diagram alone** (~234 KB
  desktop, ~136 KB mobile), which the browser would have to fetch as a *separate*
  request on top of the page. The SVG is not a weight cost; it is a weight *win*.
- **Animation is free:** `animated` and `static` variants show the same long-frame
  count (0 in both) — the gradient drift + draw-in is CSS-only and adds no
  measurable main-thread jank.
- **No layout shift:** CLS is 0 for every variant — the SVG `viewBox` reserves the
  diagram's space up front.
- **Plus the un-measurable wins** the image baseline forfeits entirely: crisp
  scaling, selectable/translatable/accessible text, and a diffable source.

Re-run the harness whenever the diagram or its animation changes, and update the
proof post's cited figures if they move materially.

## Code
<!-- Anchors are seeded post-commit via the feature-docs skill / `npm run features:seed`. -->
- src/components/UseCaseDiagram.astro — the engine: spec → deterministic layout → inline SVG
- src/components/diagram/actors.ts — actor glyphs (Earl monogram, line person, line gear)
- src/styles/global.css — `.usecase-diagram` styling + animation (gradient drift, draw-in, reduced-motion reset)
- src/content/blog/earlbear-use-cases.mdx — the proof post that embeds the diagram

## Layout quality (why the gates exist)

A diagram is only useful if it reads cleanly, so the component earns its layout
rather than trusting author placement:

- **Two-sided actors** — internal/system operators on the left, external actors on
  the right — so association lines fan to the nearest edge instead of crossing the
  middle.
- **Overlap-minimizing use-case order** — each use case is placed in the column
  facing the actors that use it (shared ones stay left so one line reaches over),
  and rows sort by their actors' barycenter.
- **Barycenter actor placement** — each actor sits at the vertical center of the
  use cases it touches, so its lines spread evenly up and down and lean horizontal.
- **Two blocking build-time gates** (they `throw`, failing the build): ≥75% of
  association lines must be crossing-free, and each actor's fan must be balanced
  (even up/down, mostly horizontal). `allowOverlap` downgrades both to warnings.

These make bad diagrams a build error, not a thing you discover in review. The
`usecase-diagram` skill documents how to satisfy them.

## Focus modal (progressive enhancement)

When a use case carries a `detail` string or participates in links, each oval
becomes a focusable button that opens a native `<dialog>` modal — the use case's
detail, its actors, and its include/extend relations. Data is inlined as JSON at
build time; the script is the *only* client JS the component ever ships, and only
for diagrams that opt in. Without JS (or `<dialog>` support) the diagram renders
and reads identically, so the zero-JS baseline holds everywhere else.

## Notes

- The proof post is `.mdx` (not `.md`) so it can embed the component inline. The
  MDX integration (`@astrojs/mdx`) is a public dependency and adds no runtime —
  components render at build time. The content collection glob and
  `check-posts.py` were both widened to `.mdx` so voice/frontmatter enforcement
  still applies. See [[mdx-posts]] if that doc exists.
- Animation lives entirely in CSS (`.usecase-diagram` in `global.css`), gated by
  `@media (prefers-reduced-motion: reduce)` → final state, no motion.
- Candidate future work: upstream the customer/system actor glyphs into
  `@earlbear/ui` once GitHub Packages billing is restored (the design system has
  no customer icon today). Tracked in `docs/tasks/backlog.md`.
