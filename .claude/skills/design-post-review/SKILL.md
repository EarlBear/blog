---
name: design-post-review
description: Audit a design/engineering blog post for quality and iterate on it — the single home for the standards a good EarlBear design post must meet (visual polish, right-component usage, and content/architecture substance). Use when the user says "review this post", "audit this design post", "is this post any good", "iterate on this post", "does this use the right diagram", or after new-post/enrich-post scaffolds a post. Runs against an EXISTING post: build + preview + screenshot, report gaps against the explicit do/avoid checklists below, then fix them. new-post and enrich-post invoke this rather than restating the rules.
---

# Design-post review (audit + iterate)

This skill is the **one place** the standards for a good design post live. Other
skills defer to it instead of duplicating the rules:

- **`new-post`** scaffolds a post, then runs this review — it does not re-state
  these standards.
- **`enrich-post`** adds a diagram, then this review confirms the *right* one was
  used (see the catalog dimension).
- **Sibling audits own their lanes — do NOT re-do their work here**, just hand off:
  performance / a11y / SEO / bundle → `frontend-audit`; public over-sharing of
  "secret sauce" → `external-post-review`; internal-vs-external classification →
  `audience-audit`. This skill owns **design-post quality**: visual polish, correct
  component usage, and content/architecture substance.

## How to run it

1. **Build + preview the real output.** `PUBLIC_AUDIENCE=internal npm run dev`
   (internal posts only render in the internal build). Open the post in the
   browser and **screenshot every component** — the source lies; the render is the
   truth. A `vite dev` pass is not enough for layout — for a final check also
   `npm run build` and preview.
2. **Walk the three checklists below**, top to bottom, against the rendered post.
   Each item is a concrete pass/fail you can see or grep.
3. **Report the gaps** as a short list (component → issue → fix), then **fix them**
   and re-screenshot. Iterate until the checklists pass.
4. `npm run posts-check` + `npm run catalog-check` must stay green.

The point is *audit AND iterate* — this skill fixes existing posts, it is not just
guidance for new ones.

---

## 1. Visual polish — do / avoid

Each of these has a known-good implementation already in the codebase; a failure
is a regression, not a new decision.

**Do**
- Post body fills the reading frame (the article column is `65vw`, capped, not a
  narrow ~720px ribbon on a wide screen). — `PostLayout.astro`
- Every `DecisionTable` row has a hover **anchor link** that deep-links (`#d3`) and
  copies the URL. — `DecisionTable.astro`
- `ComparisonMatrix` headers share one baseline (the CHOSEN badge hangs *below* its
  label); dot-rows and value-rows share one vertical rhythm.
- **Every diagram/chart can expand to fullscreen** (the hover corner button). —
  `DiagramFullscreen.astro`, covers `.flow-diagram .sequence-diagram
  .usecase-diagram .data-model .barchart`.
- Diagram **legends** sit on aligned rows, swatches at their intended size (a swatch
  must not inherit the main-diagram `svg{width:100%}` and blow up).
- A data model renders as a **true ERD** — connected boxes with crow's-foot edges,
  not a text relationship list. — `DataModel.astro`.

**Avoid**
- Stray render artifacts: a leaked JSX `}`/`{` in the prose, an un-closed
  expression, a raw component name. (Grep the built HTML for a lone `}` after a
  figure.)
- A wide table/diagram that forces the **page** to scroll sideways — it must scroll
  inside its own `overflow-x:auto` wrapper.
- Raw hex or a second theme — semantic design-system tokens only, single light
  theme.

## 2. Right component for the job (catalog usage) — do / avoid

The technique→component map is **[`../enrich-post/catalog.md`](../enrich-post/catalog.md)**
— it is the source of truth. Audit that the post used the component the catalog
prescribes, not a hand-rolled or weaker substitute.

**Do** — match the content to its component:
- Presenting **options weighed to a choice** → a `ComparisonMatrix` (options ×
  criteria, head-to-head) carries the decision. An `Accordion` may carry the
  *narrative* of each option, but a post that compares options and shows *only* an
  Accordion of A/B/C is missing the matrix — the reader can't see the trade-off at
  a glance. Prefer the matrix (Accordion optional alongside).
- A **numbered set of decisions** (D1…Dn with status) → `DecisionTable`, not a bare
  list.
- A **data model** → the true-ERD `DataModel`, not prose or a table of columns.
- A **flow / loop / pipeline / branch / swimlane** → `FlowDiagram` (the right
  `shape`), not an ordered `<ol>` pretending to be a flow.
- **Message-passing between actors over time** → `SequenceDiagram`; **who-does-what**
  → `UseCaseDiagram`.

**Avoid**
- "Prose pretending to compare" — a paragraph that lists options with pros/cons
  where a `ComparisonMatrix` belongs.
- Using the *narrative* component (`Accordion`) as a substitute for the *analytical*
  one (`ComparisonMatrix`) when the post's job is to justify a choice.
- A diagram technique with **no** catalog component (hand-rolled SVG/markup) — if
  the catalog has no row for it, that is a `new-diagram-kind` decision, not an
  ad-hoc drawing.

If the right component doesn't exist yet, that's the **`new-diagram-kind`** skill,
not a workaround.

## 3. Content & architecture substance — do / avoid

A design post earns its place by teaching a real decision to someone who wasn't
there. These are the substance checks — the ones the geometry gates can't see.

**Do — the design-post skeleton** (a design post should answer these; see also
`design-to-blog`). Each has a **component** — use it, don't hand-roll the section:
- **Requirements** → the `Requirements` component: framed **per actor** as must /
  can / cannot — "EarlBear leadership must be able to X", "the agent must *not* do
  B", "customers can do C". An actor × capability contract, not a vague wishlist.
- **Personas + impact** → the `Personas` component: *whose* life does this touch
  (leadership, operator, agent, customer, partner — a consistent cast), and *what
  they do with it* (the outcome/JTBD, concrete). role → impact, one per line.
- **Use cases** → the `UseCases` component: what it powers in **three columns —
  EarlBear · Agent · Customer** (same cast as the personas); pair it with a
  `UseCaseDiagram` for the actor↔use-case graph.
- **Options tied to the above** — the architecture-options section evaluates each
  option **against the stated requirements and use cases**, and justifies the
  choice by them. Generic, not project-jargon; the reader sees *why* the winner
  serves the actors' needs.
- **Reversal trigger** — what would make the decision wrong (teaches the reader to
  think the same way).

**Avoid — house voice, no fluff** (the full guide is
[`docs/features/house-voice.md`](../../../docs/features/house-voice.md);
`check-posts.py` hard-blocks emoji/exclamations and *warns* on the patterns below,
but voice is a judgment call, so this skill is the human judge):
- **Anthropomorphizing**: systems don't "meet", "want", "see", or "decide to feel".
  "Three people meet this agent" says nothing — cut it. State what the actor *does*.
- **Scene-setting filler**: a sentence that sets a mood but carries no information.
  Every sentence should carry a fact, a decision, or a consequence.
- **Vague over specific**: "significantly faster" → the number; "various sources" →
  which ones.
- Hype, exclamation points, emoji (the automated check enforces the last two in
  title/description; extend the discipline to the body).
- Options described so they "make no sense" out of context or don't connect to what
  the reader (an actor) needs — see the options rule in §3 Do.

---

## Notes

- **This skill defines the standards once.** If you find yourself writing a
  quality rule into `new-post` or `enrich-post`, put it *here* and reference it from
  there instead — the skills build on each other, they don't duplicate.
- The always-run subset of these checks belongs in `check-posts.py` /
  `catalog-check` as soft warnings (anti-fluff patterns, technique-without-its-
  component). The full audit is this skill, run deliberately.
- Scale the review to the post: a quick engineering note doesn't need the full
  persona/use-case skeleton; a design-with-options post does.
