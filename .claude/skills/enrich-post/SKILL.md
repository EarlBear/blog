---
name: enrich-post
description: Enrich an existing blog post with a diagram or visual that carries meaning the prose can't. Use when the user says "add a diagram to X", "this post needs a visual", "enrich this post", "make this clearer with a figure", or wants to work through the diagram-less posts. Reads the post, picks a technique from the diagram catalog (flow/loop/pipeline, use-case, decision/accordion, and our extended-Mermaid path), authors it in house voice, and verifies it renders and passes the build's layout gates.
---

# Enrich a post with a diagram

Most posts are stronger with one well-chosen visual — a flow the reader can trace,
a loop that shows a cycle, a boundary that shows what crosses it, a decision laid
out to scan. This skill turns a text-only post into one that *shows* its structure,
using the blog's own zero-dependency diagram engine.

The catalog of techniques (and which component renders each) lives next to this
file: **[catalog.md](./catalog.md)**. Read it first — it is the menu, and it grows
every time we add a primitive.

## Process

1. **Read the post and find the one place a diagram earns its space.** Not every
   paragraph wants a figure; look for the structural moment the prose is *working
   hard to describe in words*:
   - a **flow / pipeline** — "A becomes B becomes C" (data, handoffs, stages)
   - a **loop** — a process whose last step feeds the first ("flywheel", "cycle")
   - an **architecture / boundary** — what runs where, what crosses a trust line
   - a **decision** — options weighed toward a choice
   - a **use case** — who does what to a system
   One strong diagram beats three weak ones. If nothing structural is there, say so
   and stop — don't decorate.

2. **Pick the technique from [catalog.md](./catalog.md).** The catalog maps each
   shape to a component and tells you when to reach for our extended-Mermaid path
   vs. the native spec. Honor the decision rule recorded there.

3. **Convert the post to `.mdx`** if it isn't already (components can't embed in
   plain `.md`): `git mv src/content/blog/<slug>.md .mdx`, then add the import at
   the top of the body (after the frontmatter):
   ```mdx
   import FlowDiagram from '../../components/FlowDiagram.astro';
   // or Accordion, or UseCaseDiagram
   ```
   `check-posts.py` and the content collection already cover `.mdx`, so voice and
   frontmatter enforcement still apply.

4. **Author the diagram** where the prose introduces the structure, and add a short
   sentence pointing at it ("click any stage…", "here is that loop"). Fill in node
   `detail` so the click-to-focus modal has something to say. Keep every label and
   detail in house voice: sentence case, no emoji, no exclamation points.

5. **Verify — the gates only check geometry, not meaning:**
   ```bash
   npm run dev          # drafts visible; OPEN the post and look at it
   npm run posts-check  # voice + frontmatter (now on .mdx too)
   npm run build        # the FlowDiagram/UseCaseDiagram layout gates run here
   ```
   Screenshot it (headless Chrome, as the other diagram work does) on desktop and a
   narrow width. Click a node to check the modal. If a gate fails, it names the
   diagram and the fix — reorder nodes so the flow reads without backtracking, or
   split it; reach for `allowOverlap` only when a fan-out genuinely can't be linear
   (and say why).

## Our extended Mermaid

Authors can write a familiar **Mermaid flowchart** instead of the native spec —
`src/components/diagram/mermaid-parse.ts` parses the flowchart subset (nodes with
shapes, `-->` edges with `|labels|`, direction) into FlowDiagram nodes/edges, and
it renders through our engine (theme, gates, animation). A back-edge auto-detects a
loop.

```mdx
<FlowDiagram title="Pipeline" mermaid={`flowchart LR
  A[JSONL] --> B[Sanitize] -->|derived| C[(Supabase)] --> D[Dashboard]`} />
```

Why not real Mermaid? Every Node Mermaid *renderer* needs a browser DOM (`getBBox`)
that we refuse to ship, and the pure-JS shims fail on layout — verified. So we parse
Mermaid syntax and render it ourselves. That's the whole "extended Mermaid" idea:
the syntax people know, our zero-dep engine underneath. See
[catalog.md](./catalog.md) for what the parser does and doesn't cover.

## Growing the catalog

When a post needs a shape no existing component draws, that's a signal to add a
primitive — built the same way as `FlowDiagram`/`UseCaseDiagram` (build-time inline
SVG, semantic tokens, a blocking layout gate, reduced-motion animation). When you
do, **add a row to [catalog.md](./catalog.md)** so the next enrichment can find it.
That is how the catalog compounds.

## Notes

- Single light theme, semantic tokens only. Never raw hex, no dark mode.
- A diagram that only restates a sentence isn't earning its space — cut it.
- Individual posts don't get a `docs/features/` doc; the *components* do. If you add
  a primitive, reconcile `docs/features/diagram-catalog.md` via `feature-docs`.
