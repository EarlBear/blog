---
name: import-design-post
description: Import a rich design/HLD post from the sibling bytesofpurpose Docusaurus blog (../../git/omars-lab.github.io/bytesofpurpose-blog/designs/*.mdx) into the EarlBear blog, preserving the whole experience — walkthroughs, mockups, decision tables, use-case/flow/sequence/ER diagrams. Produces TWO authored flavors per source: an external (100k-ft "how it works", audience external) post and an internal (as-is, full detail, audience internal) post. Use when the user wants to bring a design doc from omars-lab into this blog. Pairs with new-post (voice + frontmatter), enrich-post (the diagram catalog), external-post-review / audience-audit (the external flavor's secret-sauce pass), and manage-authors.
---

# Import a design post into the EarlBear blog

Two rich design docs live in the **sibling repo** `../../git/omars-lab.github.io`
(a Docusaurus site). They describe how parts of the EarlBear stack are envisioned
to work, with the full apparatus of a design doc: scripted UX **walkthroughs**, UI
**mockups**, **decision tables**, **use-case / flow / sequence / ER diagrams**,
and inline **assumption** annotations. This skill brings one into the EarlBear
Astro blog **with that experience preserved**.

The source and target are different stacks (Docusaurus MDX vs Astro MDX) with
different — but parallel — component sets. This is a **transformation, not a
copy**, and it is **authored, not mechanically generated**: you read and interpret
the source, then render each flavor in EarlBear house voice. There is deliberately
no deterministic transformer script; the judgement (what to keep, what to soften,
how to phrase the 100k-ft view) is the work.

## The two flavors — mapped onto the audience split

Every source post becomes **two** authored posts, using the blog's
`audience: external` / `audience: internal` split (see `docs/features/audience-split.md`):

| Flavor | `audience` | Slug shape | What it is |
|---|---|---|---|
| **external** | `external` | `<name>.mdx` | The 100,000-ft "how it works" telling. High-level, marketing-friendly, public-safe. Keeps the story, the context diagram, the use-cases, a mockup/walkthrough, the high-level architecture — softens or omits proprietary tuning, prompts, exact economics. |
| **internal** | `internal` | `<name>-design.mdx` | The as-is, lower-level design. Full fidelity: every section, every diagram, the decision tables, the walkthrough. |

Both are hand-authored. The internal one is the faithful preservation; the external
one is a distillation you write, then run through `external-post-review` /
`secret-sauce-check` so it never over-shares.

## The house components (what maps to what)

Read **`component-map.md`** (next to this file) for the full source→target table,
prop shapes, and the Infima→`--eb-*` token map. The short version:

- Use-case diagram → **`UseCaseDiagram`** (near-1:1; actor kinds `internal|external|system`).
- Mermaid `graph`/`flowchart LR` → **`FlowDiagram`** via its `mermaid={...}` prop
  (drop the `%% animate:` directive — the draw-in is automatic). Strip hardcoded
  `classDef`/`style fill:` and `:::class` node hints; the theme colors it.
- Mermaid `sequenceDiagram` → **`SequenceDiagram`** (lifelines + messages + loop/alt fragments).
- Mermaid `erDiagram` → **`DataModel`** (entity cards + relationship list with cardinality).
- `<DecisionTable>` → **`DecisionTable`** (D1…Dn, status badges, click-to-focus detail).
- `<Mockup>` → **`Mockup`** (browser/window/phone chrome frame; author the faux UI in the slot with `--eb-*` tokens).
- `<Walkthrough>` → **`Walkthrough`** (interactive click/scrub scene player; the default slot is the app scene, named slots `scene-0…scene-5` are extra scenes; `steps` reference scenes by index and targets by CSS selector).
- `:::note/info/tip/warning[Title]` admonitions → **`Callout`**.
- `<Assumption>` inline mark → **`Assumption`**.
- Comparison tables (Option 1/2/3) → **`ComparisonMatrix`**; option narratives → **`Accordion`**.

All rich content must be in **`.mdx`**, and every component used must be
**imported** at the top of the post (a `diagrams-check` hook fails the build
otherwise). Import from `../../components/<Name>.astro`.

## Steps

1. **Read the source fully.** Open the source `.mdx` in
   `../../git/omars-lab.github.io/bytesofpurpose-blog/designs/` **and** its
   `_mockups/<name>.mdx` sidecar. Optionally open the live render (the source dev
   server runs on `:3000`, e.g. `/designs/design-<slug>`) to see the intended
   experience — especially the walkthrough motion, which you are re-rendering as
   an interactive stepper, not autoplay.

2. **Author the internal (as-is) post first** — it is the faithful one, and the
   external post is a distillation of it. `src/content/blog/<name>-design.mdx`,
   `audience: internal`, `draft: true`. Work section by section, translating each
   source construct via `component-map.md`. Preserve the section structure,
   every diagram, the decision tables, and the walkthrough. Convert prose to
   EarlBear voice (sentence case, no emoji, no exclamation points, `##` short
   kickers, tabular numerics). De-em-dash as you go (the source is full of them;
   EarlBear prose uses commas/periods/colons instead).

3. **Author the external (100k-ft) post** — `src/content/blog/<name>.mdx`,
   `audience: external`, `draft: true`. This is not a mechanical cut of the
   internal one; it is a re-telling for a public reader who wants to understand
   *how it works* without the internal design detail. Keep the story, the context
   flow, the use-cases, a mockup or walkthrough, and the high-level architecture.
   Drop the appendices, the NFR tables, the decision minutiae. Then run
   `secret-sauce-check` and, if it flags anything, soften per `external-post-review`
   (verbatim prompts, full configs, exact tuning knobs, internal economics →
   softer rewrites that keep the marketing value).

4. **Frontmatter** for each post (the EarlBear schema — `src/content.config.ts` is
   the source of truth). Required: `title`, `description`, `pubDate` (today),
   `questions` (≥1, each ends with `?` — lift them from the source's purpose /
   "who it's for"), `audience`. Map author `oeid` → the EarlBear author id
   `omar` (confirm with `ls src/content/authors/`; use `manage-authors` if adding
   one). Reuse existing lowercase `tags` (`grep -h '^tags:' src/content/blog/*.mdx | sort -u`).
   Add `expects:` for the visuals the post carries (`use-case`, `flow`,
   `comparison`, `decision`). **Drop** the source's `slug`, `source`, `diagrams`,
   `mockups`, `sidebar_*`, `kind` — none apply here (the filename is the slug).

5. **Cite figures.** Any paragraph or table with a dollar amount or percentage
   needs a footnote (`[^id]`); externally-sourced figures get a true MLA citation,
   derived figures get an explanatory footnote (see `new-post` for the exact
   rules — `check-posts.py` enforces them). The source docs' illustrative numbers
   (an `<Assumption>` value, a projected lift) are **derived/illustrative** — keep
   them wrapped in `<Assumption>` and footnote them as illustrative, not sourced.

6. **A picture is worth a thousand words.** This is the blog tenet and the whole
   point of the import: never flatten a diagram into prose. If the source drew it,
   draw it here (via the mapped component). If a long internal section has no
   visual, that is a smell — reach for the catalog (`enrich-post`).

## Verify (always prove)

```bash
npm run diagrams-check   # every used component is imported (blocks build otherwise)
npm run posts-check      # frontmatter, questions end in ?, voice, MLA citations
npm run build            # authoritative: zod schema + blocking diagram layout gates
npm run dev              # then OPEN all posts and LOOK — SVG render bugs are invisible to the source checks
```

Rendered proof matters here more than usual — the sequence/ER/decision-table
primitives and the mockups are build-time SVG/HTML, so a layout bug only shows in
the browser. Click through the `Walkthrough` scrubber; open a `DecisionTable`
detail; check the callouts and assumptions read as intended. Screenshot with the
`visual-site-review` skill if a diagram looks off.

Audience safety (the internal post must never reach the public site):

```bash
PUBLIC_AUDIENCE=external npm run build && npm run audience-check
```

`audience-check` greps the real `dist/` — assert the two internal posts are absent
from the external artifact and the two external posts are present.

## Notes and gotchas

- **De-em-dash everything.** The source is written in an em-dash voice; EarlBear
  prose does not use `—`. Rewrite: numeric range `60–70` → "60 to 70"; aside pair
  `A — x — B` → "A, x, B"; sentence break ` — ` → period or semicolon; a
  heading/label dash → colon.
- **Mermaid colors are theme-owned.** Strip any `classDef`/`style fill:`/`:::class`
  from a source Mermaid block when porting it to `FlowDiagram mermaid={...}`; the
  EarlBear theme colors the diagram in one light theme.
- **Walkthrough is interactive, not autoplay.** The source auto-plays; the port
  steps on click/scrub. Mark anchorable elements in each scene with ids and point
  the step `target` at them. Reduced-motion / no-JS readers still page through.
- **Assumptions stay assumptions.** A source `<Assumption>` value is an
  unvalidated premise; keep it wrapped so it still reads as "not yet proven",
  don't launder it into plain prose.
- **Author id.** `oeid` in the source → `omar` here. Never guess an author.
- **Draft on import.** Both flavors land `draft: true`. Publishing + deploy is a
  separate, deliberate step (`/deploy`).

## Files

- `component-map.md` — the source→target component/prop/token mapping (read this first).
- `src/components/{Callout,Assumption,Mockup,Walkthrough,DecisionTable,SequenceDiagram,DataModel}.astro` — the primitives this skill relies on.
- `.claude/skills/enrich-post/catalog.md` — the living diagram catalog (the three new diagram primitives have rows there).
- `docs/features/import-design-components.md` — why these components exist.
