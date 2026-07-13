# Import-design components (Callout, Assumption, Mockup, Walkthrough, DecisionTable, SequenceDiagram, DataModel)

## Why

We wanted to bring rich **design/HLD posts** from the sibling bytesofpurpose
Docusaurus blog into this Astro blog **with their whole experience preserved** —
scripted walkthroughs, UI mockups, decision tables, and use-case / flow / sequence
/ ER diagrams. The source blog has a whole `@omars-lab/blog-ui` component library
for these; EarlBear had targets for only some (`UseCaseDiagram`, `FlowDiagram` via
the Mermaid parser, `ComparisonMatrix`, `Accordion`). Several source constructs had
**no target here**: admonitions, inline "assumption" marks, browser-chrome mockups,
a scene walkthrough, decision catalogs, UML sequence diagrams, and ER data models.

Rather than degrade those on import, we built seven zero-dependency Astro
primitives so the imported posts keep the full experience. They follow the same
house philosophy as the existing diagram catalog: **build-time inline SVG/HTML from
a compact spec, semantic tokens only (never raw hex), deterministic layout,
reduced-motion-safe animation, and blocking layout gates** where a spec can be
wrong. Client JS appears only where interaction is the point — the `Walkthrough`
stepper and the `DecisionTable` detail modal — each a single self-contained inline
script, the same progressive-enhancement pattern `FlowDiagram`/`UseCaseDiagram`
already use for their focus modal.

The two hardest calls:

- **Walkthrough is interactive, not autoplay.** The source `<Walkthrough>` is a
  443-line React player that auto-advances scenes with a moving cursor and
  letter-by-letter typing. Porting that faithfully would import React and break the
  zero-autoplay norm. Instead the port renders every scene server-side and wires a
  reader-driven stepper (prev / next / click a dot); no-JS and reduced-motion
  readers still page through. The scenes and narration are preserved; only the
  motion is dropped, by design.
- **Sequence and ER got dedicated primitives, not the Mermaid parser.** The blog's
  extended-Mermaid path only parses the flowchart subset. A Mermaid
  `sequenceDiagram` (lifelines, sync/return messages, loop/alt fragments) and
  `erDiagram` (entities, fields, cardinality) are different grammars, so
  `SequenceDiagram` and `DataModel` render those from a native spec instead.
  `DataModel` deliberately renders as entity **cards + a relationship list** rather
  than an auto-laid-out ER graph — more robust and readable on a blog than fragile
  crossing-minimized SVG.

These are consumed by the **`import-design-post`** skill, which maps each source
construct to its target here and authors the two flavors (external 100k-ft /
internal as-is) of each design post. The three diagram primitives also have rows in
the diagram catalog (`.claude/skills/enrich-post/catalog.md`).

## Code

- https://github.com/EarlBear/blog/blob/0ce95f1/src/components/Callout.astro#L1-L36 — Callout: `:::note/info/tip/warning[Title]` admonitions → a status-token box.
- https://github.com/EarlBear/blog/blob/0ce95f1/src/components/Assumption.astro#L1-L21 — Assumption: inline amber "unvalidated premise" mark, children or bare-marker form.
- https://github.com/EarlBear/blog/blob/0ce95f1/src/components/Mockup.astro#L1-L45 — Mockup: browser/window/phone chrome frame around a live token-styled faux-UI slot.
- https://github.com/EarlBear/blog/blob/0ce95f1/src/components/Walkthrough.astro#L1-L69 — Walkthrough: interactive scene stepper (default slot = app scene, `scene-0…5` named slots, `steps` reference scenes by index + targets by selector).
- https://github.com/EarlBear/blog/blob/0ce95f1/src/components/DecisionTable.astro#L1-L98 — DecisionTable: D1…Dn decisions with status badges, row anchors, click-to-focus detail modal; gate on duplicate id / unknown status.
- https://github.com/EarlBear/blog/blob/0ce95f1/src/components/SequenceDiagram.astro#L1-L118 — SequenceDiagram: UML lifelines + ordered messages (sync/return/self) + loop/alt fragments; gate on unknown actor / out-of-bounds fragment.
- https://github.com/EarlBear/blog/blob/0ce95f1/src/components/DataModel.astro#L1-L426 — DataModel: a TRUE ERD — entity boxes (PK/FK fields) on a deterministic grid, connected by crow's-foot cardinality edges drawn as an SVG overlay; click a key to highlight it across related tables (PK ↔ its FKs); accepts native spec OR a Mermaid `erDiagram` string (parsed by `parseMermaidER`); visually-hidden relationship list is the no-JS/a11y fallback; gate on unknown entity.
- https://github.com/EarlBear/blog/blob/0ce95f1/src/styles/global.css#L865-L1177 — component styling (Callout, Assumption, Mockup, Walkthrough) in the shared global stylesheet, token-driven and reduced-motion-safe.

## Notes

- CSS for all seven lives in `src/styles/global.css` alongside the other diagram
  primitives (the components carry no `<style>` block), so they share the token
  vocabulary and the reduced-motion media query.
- The `import-design-post` skill (`.claude/skills/import-design-post/`) is the
  consumer: `SKILL.md` is the authoring guide, `component-map.md` the source→target
  mapping. See also the diagram catalog ([[diagram-catalog]]) for the three new
  diagram techniques, and the audience split ([[audience-split]]) for how the two
  flavors are gated.
- Interactive components (`Walkthrough`, `DecisionTable`) degrade cleanly: with no
  JS the walkthrough shows step 1 and pages via buttons; the decision table renders
  the full table and the `:target` row highlight works with zero JS.
