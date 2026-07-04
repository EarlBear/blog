# Plan: animated UML use-case diagrams + frontend-audit skill + evidence harness

## Context

The blog has no way to draw EarlBear's use cases. We want **customized, Mermaid-like
UML use-case diagrams** — oval use cases, a system boundary, and the **Earl mark as the
actor** (we have no "customer/user" glyph today) — rendered cleanly per the UML spec, with
**modern animated gradients** on the use-case ovals, good spacing, and design-system
fidelity. We'll prove the capability with a real post on EarlBear's key use cases (internal
users, external customers, automated system).

Three follow-on asks, all folded in: (B) a repeatable **frontend-audit skill** to keep the
site optimized; (C) **performance measurement + A/B comparison of alternatives** so we can
show our design decisions are panning out with numbers, not vibes; and throughout,
**mobile-first** designs and **task tracking** via the Task tools.

### Why a custom component and not an off-the-shelf engine (research summary)

Evaluated against two bars — *light build* (no headless browser / CI / heavy deps, matching
this repo's deliberate architecture) **and** *the desired effects* (oval UML use cases +
Earl-mark actor + design-system gradients + animation):

| Approach | Light build | Oval use cases | Earl-mark actor | Gradients | Animation |
|---|---|---|---|---|---|
| Mermaid + Playwright | ✗ ~300MB browser at build | ✗ no use-case type | ✗ | ✗ | connectors only |
| Mermaid pure-JS (`mermaid-isomorphic`) | ~ ~480KB + jsdom | ✗ no use-case type | ✗ | ✗ | ✗ |
| D2 (`astro-d2`) | ~ needs a **Go binary** on every build host | ✓ `oval`+`person` | ~ `shape:image`, fights theming | ✗ | connectors only |
| Kroki (hosted API) | ✗ network/self-host at build | ✓ (PlantUML) | ✗ | limited | ✗ |
| **Custom build-time SVG component** | ✓ **zero deps / binary / client JS** | ✓ exact UML | ✓ native (`EarlMark` pattern) | ✓ token gradients | ✓ full control |

Mermaid **still has no UML use-case diagram type** (unmerged in-progress PR #7530 / issue
#4628). No off-the-shelf engine clears both bars. The repo already inlines SVG at build time
in `src/components/EarlMark.astro` (reads the raw SVG, strips the hardcoded color so
`currentColor` tinting works) and the vendored `earl-mark.svg` already uses `<radialGradient>`
— so a small custom component is directly in-grain and adds **no build weight**.

**Decisions locked with the user:** custom build-time SVG component · ambient gradient drift +
draw-in animation (reduced-motion safe) · audit skill as a second track (functional-equivalence
first, apply only on approval) · mobile-first · perf + A/B evidence harness · tasks tracked.

---

## Track A — `<UseCaseDiagram>` component + proof post

### Design plan (frontend-design pass)

- **Palette:** semantic tokens only. Use-case ovals fill from a gradient built out of the
  qualitative data tokens (`--eb-data-1..8`) mixed toward `--color-surface` so they read as
  soft warm chips on ivory, not saturated blobs. Actor + boundary in
  `--color-text` / `--color-border`. Accent (`--color-accent`) reserved for the primary actor
  (Earl) and association endpoints. **No raw hex.**
- **Type:** IBM Plex Sans (already loaded). Use-case labels `--fs-sm`, actor labels
  `--fs-xs`/eyebrow tracking, boundary title as an eyebrow. Tabular numerics only if numbers
  appear.
- **Signature element:** the **Earl mark is the internal actor** — inlined and tinted
  `--color-accent`, standing outside the boundary exactly where the UML stick-figure goes. The
  external customer gets a **quiet complementary glyph** (a simple line "person" head+shoulders,
  authored inline in the component — the design system has no customer icon, so we create one
  minimal, on-brand mark rather than importing a foreign icon set). Optional third automated
  actor rendered as a small gear/clock line glyph.
- **Motion (spend boldness here, once):** each oval carries a slow-drifting linear gradient
  (animate `x1/x2` or gradient-transform over ~8–12s, subtle, looping); association lines
  **draw themselves in** on load via `stroke-dasharray`/`stroke-dashoffset`. `<<include>>` and
  `<<extend>>` dependency arrows are dashed with the UML stereotype label. Everything is wrapped
  in `@media (prefers-reduced-motion: reduce)` → final state, no motion.
- **Mobile-first:** SVG uses a `viewBox` + `preserveAspectRatio` and `width:100%;height:auto`
  so it scales fluidly. Below a breakpoint the component **switches from a side-by-side actor/
  boundary layout to a stacked vertical layout** (actors on top, boundary below) so labels never
  crush — driven by a `layout="auto|horizontal|vertical"` prop and a container-based decision at
  build time (default `auto` = vertical on narrow reading column). Long labels wrap via
  `<foreignObject>` or pre-measured tspans. The whole figure sits in an `overflow-x:auto`
  wrapper as a final safety net.
- **Accessibility:** `role="img"` + `<title>`/`<desc>` from props; decorative sub-parts
  `aria-hidden`. Focus-visible outline if any element is interactive.

### Files

- **`src/components/UseCaseDiagram.astro`** (new) — the engine. Props (a compact "diagram as
  code" spec):
  ```ts
  interface Actor { id: string; label: string; kind?: 'internal'|'external'|'system'; }
  interface UseCase { id: string; label: string; }
  interface Link {
    from: string; to: string;
    type?: 'association'|'include'|'extend'; // default association
  }
  interface Props {
    title: string;                 // system boundary label + a11y <title>
    desc?: string;                 // a11y <desc>
    actors: Actor[];
    useCases: UseCase[];
    links: Link[];
    layout?: 'auto'|'horizontal'|'vertical';
  }
  ```
  Internally: a tiny deterministic layout function positions actors in a column, ovals in a grid
  inside the boundary, and routes straight/curved association lines; emits one inline `<svg>`
  with a `<defs>` block of per-oval gradients (ids salted by index, mirroring the `EarlMark`
  approach). No runtime JS shipped; all layout math runs at build.
- **`src/components/diagram/actors.ts`** (new, small) — inline SVG strings for the customer
  glyph + system glyph, and a helper that inlines the Earl mark (reuse the read-strip logic from
  `EarlMark.astro`; factor the shared "read svg, strip color/size" step if clean).
- **`src/styles/global.css`** (edit) — a scoped `.usecase-diagram` block: the gradient-drift
  and draw-in `@keyframes`, the `prefers-reduced-motion` reset, and the responsive
  stacked-layout rule. Follows the existing pattern (this file already owns `.astro-code`,
  `.prose`, table styling).
- **Proof post — `src/content/blog/earlbear-use-cases.md`** (new, via the `new-post` skill for
  frontmatter/voice/questions compliance). Astro renders `.md` — to embed a component we either
  (a) author this one post as **`.mdx`** and enable `@astrojs/mdx`, or (b) keep `.md` and expose
  the diagram through the layout. **Decision: add `@astrojs/mdx`** (public dep, no build weight,
  first-class Astro) and write the proof post as `earlbear-use-cases.mdx` so authors can drop
  `<UseCaseDiagram .../>` inline. Confirm `content.config.ts` glob includes `mdx` (extend
  pattern to `**/*.{md,mdx}`) and that `check-posts.py` still validates it.
- **`docs/features/`** (new why-doc) — record *why* the custom-SVG engine over Mermaid/D2, via
  the `feature-docs` skill, with permalink anchors to the component.

### Content of the proof post

Actors: **Earl (internal user)**, **Customer (external)**, **Scheduler (automated system)**.
Use cases (EarlBear = production-traffic / experimentation product, per existing posts): Route
production traffic · Run experiment · Review results · Roll back · Get alerted · Export report.
Relationships show all three link types: associations (actor→use case), `<<include>>` (Run
experiment ▸ includes ▸ Review results), `<<extend>>` (Roll back ▸ extends ▸ Get alerted). Post
walks through the notation, then embeds the live animated diagram as the hero.

---

## Track B — `frontend-audit` skill

A guided, **local + advisory** workflow in `.claude/skills/frontend-audit/SKILL.md`, matching
the repo's existing skill shape (`new-post`, `deploy`, `feature-docs`).

- **Flow:** `npm run build` → `npm run preview` → drive the **Chrome DevTools MCP tools**
  (available this session: `lighthouse_audit`, `performance_start_trace`/`stop_trace`,
  `performance_analyze_insight`, `list_network_requests`) against the previewed URL, on **both
  desktop and a mobile viewport** (`resize_page` / `emulate`).
- **Report:** a ranked findings list across perf / a11y / SEO / bundle weight, each with the
  measured number and the fix.
- **Two-tier stance (locked):**
  - **Tier 1 — functional-equivalent:** behavior-preserving speedups (e.g. defer non-critical
    CSS, drop unused font weights from the Google Fonts URL, add `loading`/`decoding` hints,
    inline critical SVG already-done patterns). **Applied only on your approval.**
  - **Tier 2 — better-practice / behavior-shifting:** recommended in the report, **never
    auto-applied**.
- **No new heavy deps, no CI:** the skill uses the already-present Chrome + MCP tooling; it does
  not install Lighthouse/Playwright into the repo. Optional `make audit` convenience target that
  just prints "run `/frontend-audit`" guidance (keeps the Makefile honest — the real work is the
  skill).
- Nothing about this skill blocks commits; it's advisory, like the repo's other hooks.

---

## Track C — perf measurement + A/B evidence ("prove the decisions are panning out")

**Honest scoping for a static GitHub Pages site:** there is no server, no analytics backend, and
no live traffic to split, so a *production* A/B test (real users, conversion metrics) is out of
scope without new infrastructure. What we **can** do — and what actually proves the design
decisions — is a **local, reproducible A/B/perf harness** that measures the alternatives
head-to-head under controlled conditions. This is the evidence.

- **`scripts/diagram-bench.mjs`** (new) — builds a tiny set of **variant pages** (fixtures under
  `src/pages/_bench/` excluded from sitemap/RSS, or built ad hoc) each rendering the *same*
  diagram a different way:
  - **A:** custom SVG, animated (the chosen design)
  - **B:** custom SVG, static (animation off) — isolates the animation cost
  - **C:** a baseline — the same diagram exported once as a **static PNG/flat SVG** (stand-in for
    "what an image-export / D2 route would ship") — isolates our approach's cost vs. a dumb image
  Then drives the **Chrome MCP perf tools** to capture, per variant, on **desktop + mobile
  viewport**: added HTML/transfer weight, first render / paint cost, **CLS** (layout stability),
  and **animation frame cost** (long-frame count during the drift loop). Emits a small markdown
  table.
- **Output:** `docs/diagram-bench.md` — the A/B/perf comparison table, regenerable. This is the
  artifact the proof post can cite ("animation adds N ms/frame and 0 CLS; our inline SVG is
  X KB vs the image baseline's Y KB") so the decision is backed by numbers.
- **Guardrail (per frontend-design):** if a variant wins on weight but loses the effect, we say
  so explicitly — no silent truncation of the comparison.

This gives a *repeatable* way to re-run the comparison whenever the diagram or animation changes,
which is the durable version of "A/B test alternatives to prove decisions."

---

## Task tracking (in-plan, per request)

Live Task-tool items already created and carried through implementation:

1. **Track A** — UseCaseDiagram component + proof post *(in progress once we start)*
2. **Track B** — frontend-audit skill
3. **Track C** — diagram perf + A/B harness

Each maps to the durable record: on completion, move its line from `docs/tasks/backlog.md` →
`docs/tasks/done.md` with `@done(...)` + `#git:<sha>`, per CLAUDE.md. New sub-tasks discovered
during build get their own Task items before code is written.

---

## Verification (end-to-end)

1. **Build is still light & green:** `npm run build` succeeds with only public deps added
   (`@astrojs/mdx`); no Playwright/Go/binary introduced. `npm run posts-check`,
   `npm run tasks-check`, `make features-check` all pass.
2. **Diagram renders correctly:** `npm run dev`, open the proof post — verify oval use cases,
   Earl-mark actor outside the boundary, `<<include>>`/`<<extend>>` dashed arrows with labels,
   gradient drift + line draw-in on load.
3. **Mobile-first:** narrow the viewport (and run the Chrome MCP mobile emulation) — diagram
   switches to stacked layout, no horizontal overflow of the page, labels legible.
4. **Reduced motion:** with `prefers-reduced-motion: reduce`, the diagram shows its final state
   with no animation.
5. **Accessibility:** SVG exposes `role="img"` + title/desc; keyboard focus visible on any
   interactive part; Lighthouse a11y pass via `/frontend-audit`.
6. **Audit skill:** run `/frontend-audit` end-to-end; confirm it produces a ranked report and
   only edits after approval.
7. **Evidence harness:** run `node scripts/diagram-bench.mjs`; confirm `docs/diagram-bench.md`
   regenerates with the A/B/perf table on desktop + mobile.

## Out of scope / explicit non-goals

- Production (live-traffic) A/B testing — needs server + analytics this static site lacks; Track
  C is the local reproducible substitute.
- A general Mermaid/D2 engine — we build only the use-case diagram we need; the component's spec
  is extensible later if we want more diagram types.
- Dark mode — repo is deliberately single light theme.
