# Component map: bytesofpurpose (Docusaurus) → EarlBear (Astro)

The reference for porting a source design post's constructs to EarlBear
components. Source components come from `@omars-lab/blog-ui`; target components
live in `src/components/*.astro` and are imported per-post.

## Diagrams and rich components

| Source construct | Target component | Prop mapping / notes |
|---|---|---|
| `<UseCaseDiagram actors/useCases/links>` | **`UseCaseDiagram`** | Near-1:1. Actor `kind` is the same enum: `internal \| external \| system`. `links` may add `type: 'include' \| 'extend'`. Watch the blocking overlap + actor-balance gates; reorder actors/use-cases or set `allowOverlap` if a busy diagram trips them. |
| Mermaid `graph LR` / `flowchart LR` (with `%% animate: flow`, `:::class` node hints, `classDef`) | **`FlowDiagram`** via `mermaid={`…`}` | Paste the flowchart body into the `mermaid` prop. **Drop** the `%% animate:` directive (draw-in is automatic), the `<div className="mermaid-animated …">` wrapper, all `classDef`/`style fill:`, and the `:::people`/`:::engine`/etc. node-class hints (those color nodes in the source; the EarlBear theme colors them here). For `edge`/`store`/`external` node kinds, use the **native** `nodes`/`edges` spec instead of Mermaid, and add `legend`. |
| Mermaid `sequenceDiagram` (participants, `->>`, `-->>`, `loop`/`alt`/`opt`) | **`SequenceDiagram`** | `participant X as Label` → `actors:[{id:'X',label:'Label'}]`. `A->>B: msg` → `{from:'A',to:'B',label:'msg',kind:'sync'}`; `A-->>B` (dashed return) → `kind:'return'`; a self-message → `kind:'self'`. A `loop`/`alt`/`opt` block → a `fragments` entry `{kind:'loop',label:'…',from:<firstMsgIndex>,to:<lastMsgIndex>}` (0-based, inclusive message indexes). |
| Mermaid `erDiagram` (`A ||--o{ B : "label"`, entity `{ field type PK }`) | **`DataModel`** | Each `ENTITY { … }` → `entities:[{id:'ENTITY',label:'Entity',fields:[{name,type,key:'pk'\|'fk'}]}]`. Each relationship line → `relations:[{from,to,label,card}]`. Cardinality: `\|\|--\|\|`→`one-to-one`, `\|\|--o{`→`one-to-zero-or-many`, `\|\|--o\|`→`one-to-zero-or-one`, `\|\|--\|{`→`one-to-many`, `}o--o{`→`many-to-many`. Fields are optional — a bare entity renders as a titled card. |
| `<DecisionTable decisions=[{id,decision,status,choice,statusNote,detail}]>` | **`DecisionTable`** | Same shape, but `decision`/`choice`/`detail` are **HTML strings** here (not JSX) — use `<strong>…</strong>` inline HTML, not `<>…</>`. `status` is the same enum `decided\|leaning\|open\|tbd`. A `detail` string makes the id cell a click-to-focus modal button. |
| `<Mockup chrome title url caption>` | **`Mockup`** | Same props (`chrome: browser\|window\|phone\|none`). Author the faux UI in the **slot**. Rewrite all inline styles' `--ifm-*` vars to `--eb-*` (see token map below). Mark anchorable elements with `id`s for the walkthrough. |
| `<Walkthrough steps customScene(s)>` (autoplaying) | **`Walkthrough`** (interactive) | The app scene is the **default slot**; each source `customScene`/`customScenes[i]` becomes a **named slot** `slot="scene-<i>"` (a `<Mockup>`). `steps` shape here: `{scene:'app'\|<number>, target?:'#css-selector', say?:'caption'}` — `scene:'app'` = default slot, a number = `scene-<n>`. Source step types `move`/`highlight`/`scene` all collapse to "show this scene, highlight this target, show this caption". Drop `dragSelect`/`type`/`comment`/`click`/claude-beat steps (our two source posts don't use them). No autoplay — the reader steps with prev/next/dots. |
| Comparison tables (Option 1/2/3 head-to-head; markdown or `<ComparisonMatrix>`) | **`ComparisonMatrix`** | Options = columns, criteria = rows, cells = `yes\|no\|partial` or a value; mark the chosen column `chosen:true`. |
| Option narratives (the prose weighing each option) | **`Accordion`** | Each option = a fold `{summary, body (HTML), verdict:'chosen'\|'rejected'}`. |

## Callouts and inline

| Source construct | Target | Notes |
|---|---|---|
| `:::note[Title]` / `:::info[Title]` / `:::tip[Title]` / `:::warning[Title]` | **`Callout`** | `<Callout kind="note\|info\|tip\|warning" title="Title">body</Callout>`. Body is the slot (MDX children). |
| `<Assumption>text</Assumption>` and bare `<Assumption />` | **`Assumption`** | Same two forms. Keep it wrapped — a source assumption is an unvalidated premise, not prose. |
| Markdown blockquote pull-quotes | leave as markdown `>` | Styled globally by `.prose blockquote`. Don't convert a real pull-quote into a Callout. |
| GFM footnotes `[^id]` + defs; reference-style links `[x][ref]` | keep as-is | Render natively in MDX. Verify no MDX-parse breakage (bare `<url>` autolinks and stray `<` before a space/digit must be escaped). |

## Frontmatter map

| Source key | EarlBear | Action |
|---|---|---|
| `title` | `title` | Keep (sentence case; de-em-dash). |
| `description` | `description` | Keep / rewrite to one or two sentences, sentence case. |
| `authors: [oeid]` | `authors: [omar]` | Map `oeid` → `omar`. Confirm via `ls src/content/authors/`. |
| `tags` | `tags` | Reuse existing lowercase tags; add `internal` where apt. |
| — | `pubDate` | Today, `YYYY-MM-DD`. |
| — | `questions` | **Required**, ≥1, each ends with `?`. Lift from the source's purpose / "who it's for". |
| — | `audience` | **Required.** `external` for the 100k-ft post, `internal` for the as-is post. |
| — | `expects` | Optional: the visuals the post carries (`use-case`, `flow`, `comparison`, `decision`). |
| — | `draft: true` | On import. |
| `slug`, `source`, `diagrams`, `mockups`, `sidebar_label`, `sidebar_position`, `kind` | — | **Drop.** The filename is the slug; the rest are Docusaurus/importer bookkeeping with no EarlBear analog. |

## Token map (Infima `--ifm-*` → EarlBear `--eb-*` / `--color-*`)

Rewrite every inline style in a ported `<Mockup>`/faux-UI. Never use raw hex.

| Source (`--ifm-*`) | EarlBear |
|---|---|
| `--ifm-color-primary` | `--color-accent` (or `--eb-earl-600` for a stronger tint) |
| `--ifm-color-primary-contrast-background` / lightest | `--color-accent-soft` |
| `--ifm-background-color` | `--color-canvas` |
| `--ifm-background-surface-color` | `--color-surface` / `--color-surface-sunken` |
| `--ifm-color-emphasis-100 … 200` | `--color-surface-sunken` / `--color-border-subtle` |
| `--ifm-color-emphasis-300 … 400` | `--color-border` / `--color-border-strong` |
| `--ifm-color-emphasis-600 … 800` | `--color-text-muted` / `--color-text-secondary` / `--color-text` |
| `--ifm-font-color-base` | `--color-text` |
| `--ifm-font-family-base` / `-monospace` | `--font-sans` / `--font-mono` |
| success / warn / error hues (`#79b46a`, `#e6b04a`, `#e06c5e`, `#c0473a`) | `--eb-success` / `--eb-warning` / `--eb-error` (and `-bg` variants for tints) |
| chart series colors | `--eb-data-1 … --eb-data-8`, in order |

## What has no target (and what to do)

- **Autoplaying walkthrough motion** (cursor animation, letter-by-letter typing,
  the Claude-CLI beat scene) — not ported. The interactive stepper preserves the
  scenes and narration; the motion is dropped by design (zero-autoplay).
- **`<DiagramWithFootnotes>`, `<MindMap>`, `<ComparisonMatrix>` fancy modal, copy-anchor-to-clipboard on DecisionTable** — not needed for the two source posts; build if a future import needs one (`new-diagram-kind`).
- **State / gantt Mermaid** — no primitive yet; reshape or build one.
