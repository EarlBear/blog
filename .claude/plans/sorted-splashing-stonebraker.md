# Import two design posts (two flavors each) via a new `import-design-post` skill

## Context

Two rich design docs live in the sibling repo `../../git/omars-lab.github.io`
(a Docusaurus site). They lay out how parts of the EarlBear stack are envisioned
to work, and the user wants them on the EarlBear blog **with the whole experience
preserved** — the walkthroughs, mockups, decision tables, use-case diagrams, and
the flow / sequence / ER diagrams:

- `bytesofpurpose-blog/designs/2026-06-21-ecommerce-site-scanner-and-lead-generation-engine.mdx`
- `bytesofpurpose-blog/designs/2026-06-22-self-healing-storefront.mdx`

Live renders (dev server is up): `http://localhost:3000/designs/design-self-healing-storefront`
and `/designs/design-ecommerce-site-scanner-and-lead-generation-engine`.

**Two flavors per source, mapped onto the blog's audience split:**
- **external** (`audience: external`) — a 100,000-ft "how it works" view, public-safe.
- **internal** (`audience: internal`) — the as-is, lower-level design, full fidelity.

**Both flavors are authored, not deterministically generated.** The durable
deliverable is therefore a reusable **authoring skill** (`import-design-post`) plus
the **new zero-dep Astro components** the posts need — not a transformer script. The
skill guides a human-in-the-loop pass: read + interpret the source, render each
flavor in EarlBear house voice. These two source posts are imported as the proof.

### Why this is not a copy-paste

The source is Docusaurus MDX; the target is Astro MDX with a different (also rich)
component set. Concrete gaps, from a full inventory of both sides:

| Source construct (Docusaurus) | Target today | Plan |
|---|---|---|
| `<UseCaseDiagram actors/useCases/links>` | `UseCaseDiagram.astro` — **near-1:1** (same `internal/external/system` kinds) | reuse as-is |
| mermaid `graph/flowchart LR` (~10–11 each) | `FlowDiagram` via `mermaid-parse.ts` (flowchart subset) | reuse; drop `%% animate:` (draw-in is automatic) |
| `<DecisionTable>` (D1–Dn, status badges, JSX detail) | `ComparisonMatrix` (options×criteria) — imperfect | **new `DecisionTable.astro`** (matches source semantics) |
| mermaid `sequenceDiagram` (1 each) | **none** | **new `SequenceDiagram.astro`** |
| mermaid `erDiagram` (1 each) | **none** | **new `DataModel.astro`** (ER entities/relations) |
| `<Mockup chrome browser/window>` + hand-built SVG chart | **none** | **new `Mockup.astro`** (chrome frame, build-time SVG) |
| `<Walkthrough steps customScenes>` (443-LOC React player) | **none** | **new `Walkthrough.astro`** — interactive island (click/scrub) |
| `<Assumption>` inline amber mark (7 / 16 uses) | **none** | **new `Assumption.astro`** |
| `:::note/info/tip[Title]` admonitions (6 each) | blockquote only | **new `Callout.astro`** |
| `<!-- truncate -->`, `import Mockups from './_mockups/…'` | n/a | drop (Astro has no fold); inline the mockup component/import |
| GFM footnotes, reference-style links | render natively | keep; verify MDX-safe |
| frontmatter `slug/source/diagrams/mockups/kind/sidebar_*` | EarlBear schema (`audience`, `questions`, …) | re-map (see below) |

**Zero-JS note:** the blog is not strictly zero-JS — `FlowDiagram.astro` and
`UseCaseDiagram.astro` already ship a scoped `<script is:inline>` for their
click-to-focus `<dialog>` modal. The interactive `Walkthrough` island follows that
exact self-contained-inline-script pattern (internal posts only).

## Deliverables

### A. New Astro components in `src/components/` (zero external deps, build-time SVG, semantic tokens only)

Model every one on the existing house engine (build-time inline SVG, `--eb-*`
tokens from `src/styles/tokens.css`, reduced-motion-aware, a blocking layout gate
where meaningful, scoped `<script is:inline>` only if interactive). Map the source
mockups' Infima vars → EarlBear tokens: `--ifm-color-primary`→`--eb-earl-600`,
`--ifm-color-emphasis-###`→`--eb-stone-*`/`--eb-hairline`, `--ifm-background-surface-color`→`--eb-ivory`,
success/warn/error → `--eb-success/--eb-warning/--eb-error`, chart series → `--eb-data-*`.

1. **`Callout.astro`** — `:::note/info/tip` admonitions. Props `{ kind: 'note'|'info'|'tip'|'warning', title?, }` + slot body. Themed with `--eb-info/-bg`, `--eb-warning/-bg`, etc.
2. **`Assumption.astro`** — inline amber `<mark>` with an "Assumption" tag, matching the source's intent (unvalidated premise that must jump out). Supports both children and bare-marker forms. Uses `--eb-warning`.
3. **`SequenceDiagram.astro`** — UML sequence (actor lifelines + ordered messages). Props `{ title, desc?, actors: [{id,label}], messages: [{from,to,label,kind?:'sync'|'async'|'return'}] }`. Build-time SVG lifelines + arrows; add a catalog row + a layout gate. (New primitive → follow `new-diagram-kind` conventions.)
4. **`DataModel.astro`** — ER model. Props `{ title, desc?, entities: [{id,label,fields?:[{name,type,key?}]}], relations: [{from,to,label,card?}] }`. Renders entity boxes + labeled relationship edges (cardinality). New primitive → catalog row + gate.
5. **`DecisionTable.astro`** — numbered decisions with status badges + click-to-focus detail (the source `<DecisionTable>` semantics, which `ComparisonMatrix` does not cover). Props `{ title, desc?, decisions: [{id, decision, status:'decided'|'leaning'|'open'|'tbd', choice?, statusNote?, detail?}] }`. Reuse the `FlowDiagram` modal-script pattern for `detail`.
6. **`Mockup.astro`** — a framed "what it looks like" impression. Props `{ chrome:'browser'|'window'|'phone'|'none', title?, url?, caption? }` + slot. Renders the chrome frame; the inner faux-UI/SVG chart is authored per-post in the slot with `--eb-*` tokens.
7. **`Walkthrough.astro`** — interactive scene player (internal only). Props `{ steps, scenes }`; renders scenes as stacked `<Mockup>` frames with a scoped `<script is:inline>` that advances scene/highlight on click + a scrubber (prev/next), showing each step's narration caption. No autoplay. Honors `prefers-reduced-motion` (falls back to all-scenes-visible).

Each **new diagram primitive** (`SequenceDiagram`, `DataModel`, `DecisionTable`)
gets: a row in `.claude/skills/enrich-post/catalog.md`, and a `docs/features/`
why-doc via the `feature-docs` skill (per the catalog's "adding a technique" rule).

### B. The skill: `.claude/skills/import-design-post/`

- **`SKILL.md`** — the authoring guide: locate a source design post; read it +
  its `_mockups/*.mdx` sidecar and (optionally) the live render; decide the
  external vs internal cut; author both flavors in EarlBear voice (sentence case,
  no emoji/exclamations, tabular numerics, `##` short kickers); the required
  `questions` list (lift from the source's purpose); MLA-cite every figure; run
  the external flavor through `external-post-review` / `secret-sauce-check`; verify.
- **`component-map.md`** — the source→target table above, kept as the living
  mapping reference (which source construct becomes which component, prop shapes,
  the Infima→`--eb-*` token map, and what has no target + how it degrades).

### C. The four posts (authored, both flavors)

For each source, an **internal** (as-is) and an **external** (100k-ft) post:

```
src/content/blog/
  self-healing-storefront.mdx              audience: external   (100k-ft)
  self-healing-storefront-design.mdx       audience: internal   (as-is, full)
  ecommerce-site-scanner.mdx               audience: external   (100k-ft)
  ecommerce-site-scanner-design.mdx        audience: internal   (as-is, full)
```

Frontmatter re-map to the EarlBear schema (`src/content.config.ts`): `title`,
`description`, `pubDate` (today), `authors` (map `oeid` → an EarlBear author id;
ask/`manage-authors` if none), `tags` (reuse existing lowercase tags), the
**required `questions`** list, `audience`, `draft: true`, and `expects:` declaring
the visuals each carries. Drop `slug` (filename is the slug), `source`, `diagrams`,
`mockups`, `sidebar_*`, `kind`. Every `.mdx` must **import each component it uses**
(enforced by `diagrams-check`).

**Internal** = faithful, full: all sections, every diagram, the decision tables,
the walkthrough. **External** = a distilled "how it works" telling — exec summary,
context flow, use-cases, the mockup/walkthrough, the high-level architecture — with
proprietary tuning/prompts/economics softened or omitted (secret-sauce pass).

## Execution order

1. Confirm the author id for `oeid` (`ls src/content/authors/`; `manage-authors` if missing).
2. Build the components in dependency order: `Callout` → `Assumption` → `Mockup` → `Walkthrough` → `DecisionTable` → `SequenceDiagram` → `DataModel`. Prove each renders in a throwaway `.mdx` before moving on.
3. Add catalog rows + `docs/features/` why-docs for the three new diagram primitives.
4. Write the skill (`SKILL.md` + `component-map.md`).
5. Author **self-healing-storefront** internal first (richest: `UseCaseDiagram`, `DecisionTable`, ER, sequence, walkthrough with SVG chart), then its external flavor.
6. Author **ecommerce-site-scanner** internal, then external.
7. Update `docs/tasks/backlog.md` → `done.md` per the task convention.

## Key files to reuse (not reinvent)

- `src/components/FlowDiagram.astro` — the modal-script + gate pattern to copy for `DecisionTable`/`Walkthrough`; and the mermaid path for all flowcharts.
- `src/components/UseCaseDiagram.astro` — reused directly; also the SVG-actor-glyph + `<script is:inline>` precedent.
- `../../git/omars-lab.github.io/packages/blog-ui/src/components/{Mockup,Walkthrough,DecisionTable,Assumption,SequenceDiagram?}/` — the source implementations to port from (React → Astro; `--ifm-*` → `--eb-*`).
- `src/styles/tokens.css` — the `--eb-*` semantic tokens (no raw hex).
- `.claude/skills/{new-post,enrich-post,new-diagram-kind,external-post-review,feature-docs,manage-authors}` — the house workflows this skill composes.
- `../../git/omars-lab.github.io/.claude/skills/import-co-design/` — the source repo's own importer (reference for the transformation contract, e.g. de-em-dash, MDX-safety, mermaid color-strip). We adapt its *ideas*, authored not scripted.

## Verification (end-to-end)

1. `npm run diagrams-check` — every used component is imported (blocks build otherwise).
2. `npm run posts-check` — frontmatter, `questions` end in `?`, voice, MLA citations for every $/%.
3. `npm run build` — authoritative: zod schema + the blocking diagram layout gates (overlap/balance/dangling) run here. Must pass for both audiences.
4. `npm run dev` → open all four posts. **Look at every diagram** (SVG renders client-invisible failures the source check can't see): the new sequence/ER/decision-table primitives, the mockups' faux-UI + SVG chart, and click through the `Walkthrough` scrubber. Confirm the "Questions this post answers" block, byline, footnotes, and callouts render.
5. `PUBLIC_AUDIENCE=external npm run build` then `npm run audience-check` — assert the two internal posts are **absent** from the external `dist/`; assert the two external posts are present. (`npm run audience-check` greps the real artifact.)
6. Run `secret-sauce-check` / `external-post-review` on the two external posts — no proprietary over-share.
7. Interactive `Walkthrough`: verify it degrades to all-scenes-visible under `prefers-reduced-motion` and needs no network.

## Out of scope / deferred

- No deterministic transformer script (both flavors are authored).
- No autoplay in the walkthrough (interactive click/scrub only).
- Deploy is a separate, deliberate step (`/deploy`); posts land as `draft: true`.
