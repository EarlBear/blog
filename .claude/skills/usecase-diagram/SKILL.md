---
name: usecase-diagram
description: Author a UML use-case diagram on the blog with the <UseCaseDiagram> component. Use when the user wants to draw who uses a system and what they do — "add a use-case diagram", "draw the actors and use cases", "diagram the X workflow" — or when a diagram fails the build's overlap/balance gates and needs fixing. Covers the spec shape, the two-sided actor layout, ordering use cases to minimize line crossings, the two blocking layout gates, and the click-to-focus detail modal.
---

# Use-case diagrams

`src/components/UseCaseDiagram.astro` renders a UML use-case diagram to inline SVG
at build time — oval use cases inside a system boundary, actors outside,
association / «include» / «extend» links, an ambient-gradient animation, and an
optional click-to-focus modal. No dependencies, no client JS unless a diagram
opts into the modal. Rationale for building it (vs. Mermaid/D2) is in
`docs/features/usecase-diagrams.md`.

Posts that embed a component must be **`.mdx`** (not `.md`). Import it:

```mdx
import UseCaseDiagram from '../../components/UseCaseDiagram.astro';
```

## The spec

```mdx
<UseCaseDiagram
  title="EarlBear"                {/* system boundary label + a11y title */}
  desc="One-line summary."        {/* optional caption + a11y desc */}
  actors={[
    { id: 'earl',      label: 'Earl (internal)', kind: 'internal' },
    { id: 'customer',  label: 'Customer',        kind: 'external' },
    { id: 'scheduler', label: 'Scheduler',       kind: 'system'   },
  ]}
  useCases={[
    { id: 'experiment', label: 'Run experiment', detail: 'Optional text shown in the modal.' },
    { id: 'review',     label: 'Review results' },
  ]}
  links={[
    { from: 'earl', to: 'experiment' },                       {/* association */}
    { from: 'experiment', to: 'review', type: 'include' },    {/* «include» */}
    { from: 'rollback',   to: 'alert',  type: 'extend'  },    {/* «extend» */}
  ]}
/>
```

- **`kind`** decides the side (see below); default is `external`. Ids must be
  unique; `from`/`to` reference actor or use-case ids. Dangling refs are skipped.
- **`detail`** on a use case is optional; if any use case has detail or
  relationships, the diagram becomes clickable (see Modal). Otherwise it ships
  zero JS.

## Layout: how to keep it clean

The component places things automatically, but the *spec* determines whether the
result is readable. Two rules:

1. **Actor side is driven by `kind`.** Internal + system actors are drawn on the
   **left**; external actors on the **right**. So put the people who operate the
   system (`internal`/`system`) as those kinds, and the people it serves
   (`external`) as `external`. Lines then fan to the nearest edge instead of
   crossing the middle.

2. **A use case sits near the actors that use it.** The component puts a use case
   in the right column only when more right-side (external) actors use it than
   left-side ones; a use case shared across sides stays left so just one line
   reaches across. You rarely tune this by hand — but if a diagram is busy, the
   lever is *which actors associate with which use cases*.

Actors are auto-placed at the vertical center of the use cases they touch, so
their lines spread evenly up and down. You don't position anything.

## The build gates (these BLOCK the build)

Two checks run at build time for every diagram and **throw** (failing the build)
when a layout is too tangled to read:

- **Overlap gate** — at least **75%** of association lines must be crossing-free.
- **Balance gate** — each actor's lines must fan evenly (roughly equal up/down)
  and lean horizontal, not all shoot one direction.

When one fails, the error names the diagram and the offending actor/percentage.
Fix it by:

- **Reassigning `kind`** so operators are left, served users are right.
- **Trimming incidental links** — a use case touched by many actors is a crossing
  magnet; ask whether every association is essential.
- **Splitting a busy diagram** into two focused ones.
- **Giving it more vertical room** — a very short boundary can't spread actors
  out (add use cases’ worth of height by not over-crowding one column).

Escape hatch (use sparingly, and say why in the post or a comment): pass
**`allowOverlap`** on the `<UseCaseDiagram>` to downgrade both gates to warnings.
Prefer fixing the layout — a diagram that trips the gate is usually genuinely hard
to read.

## The detail modal (click to focus)

If any use case has a `detail` string or participates in links, each oval becomes
a focusable button; clicking (or Enter/Space) opens a native `<dialog>` modal
showing the use case's detail, which actors use it, and its include/extend
relations. It is **progressive enhancement**: without JS, or without `<dialog>`
support, the diagram still renders and reads identically — nothing is gated behind
the script. Add a line in the prose telling readers the ovals are clickable.

Keep `detail` short (one or two sentences), sentence case, house voice (no emoji,
no exclamation points) — it renders as prose in the modal.

## After authoring

1. `npm run dev` and **open the post** — the gates only guarantee the lines are
   untangled, not that labels read well. Look at it. Click a use case to check the
   modal. Narrow the window to confirm it reflows.
2. `npm run posts-check` (voice/frontmatter) and `npm run build` (the gates run
   here too — a green build means every diagram passed).
3. If you changed the component itself, reconcile `docs/features/usecase-diagrams.md`
   via the `feature-docs` skill.

## Notes

- Single light theme, semantic tokens only — the component already uses them; if
  you extend it, never add raw hex or dark-mode overrides.
- Animation (gradient drift + line draw-in) is CSS-only and disabled under
  `prefers-reduced-motion`.
- The diagram scales fluidly and, on very narrow screens, scrolls horizontally
  inside its own wrapper rather than pushing the page sideways.
