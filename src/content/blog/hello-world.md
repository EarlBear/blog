---
title: Hello from the den
description: The first post on the EarlBear blog, and a quick tour of how it is built.
pubDate: 2026-07-03
tags: [meta, engineering]
authors: [omar, sad]
---

Welcome to the EarlBear blog. This is where we write about the systems behind
self-healing ecommerce, the experiments we run, and what we learn shipping to
live storefronts.

This first post exists mostly to prove the plumbing works, so here is a short
tour of the stack.

## How it is built

The blog is a static site built with [Astro](https://astro.build). Posts are
plain markdown files with a little frontmatter, and every page is pre-rendered
to HTML at build time — no client-side JavaScript unless a post needs it.

Styling comes from the shared EarlBear design system, so the blog uses the same
ivory canvas, terracotta accent, and IBM Plex type as the rest of our surfaces.
We import the design tokens once and lean on them everywhere, which means a
color like `var(--color-accent)` stays consistent across every EarlBear
property.

## Code renders too

Technical posts need readable code. Fenced blocks are syntax-highlighted at
build time with Shiki, themed to sit on the warm surface color:

```ts
type Healable = { id: string; confidence: number };

/** Apply auto-heals above the confidence threshold, newest first. */
function selectHeals(candidates: Healable[], threshold = 0.9): Healable[] {
  return candidates
    .filter((c) => c.confidence >= threshold)
    .sort((a, b) => b.confidence - a.confidence);
}
```

Inline code like `selectHeals(candidates, 0.95)` gets its own subtle treatment,
distinct from the block above.

## What is next

More posts, on real topics. Subscribe via [RSS](/rss.xml) if you want them as
they land, or browse everything from the [posts index](/).
