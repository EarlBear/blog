# EarlBear — Blog

The EarlBear blog: engineering notes, product writing, and technical posts,
served as a **static Astro site via GitHub Pages** at
**https://blog.earlbear.com**.

Built with [Astro](https://astro.build). Styling comes from the shared EarlBear
design system (vendored into `src/styles/tokens.css` + `public/vendor/`), so the
blog matches the rest of EarlBear (ivory canvas, terracotta accent, IBM Plex).

## Authoring a post

Add a markdown file to `src/content/blog/`. The filename becomes the URL slug —
`src/content/blog/live-inventory-badges.md` → `/blog/live-inventory-badges/`.

```md
---
title: A short, sentence-case title
description: One or two sentences shown in listings, RSS, and social previews.
pubDate: 2026-07-03
# updatedDate: 2026-07-10   # optional
tags: [engineering, experiments]
authors: [omar]             # author ids = file stems in src/content/authors/
questions:                  # required: what this post answers (from the ask that prompted it)
  - What problem does this solve?
  - How does it work?
draft: false                # drafts show in `npm run dev`, never in production
---

Body in markdown. Fenced code blocks are syntax-highlighted at build time.
```

`questions` is required (at least one): the questions the post answers, usually
taken from the request that prompted it. They render in a block at the top of the
post. The easiest way to scaffold all of this correctly is the **`new-post`**
skill (`/new-post`), which prompts for each field and verifies the build.

House style: sentence case, no emoji, no exclamation points.

## Local development

All dependencies are public — the design system is vendored into the repo, so no
tokens or private-registry auth are needed:

```bash
npm install
make install-hooks   # wire the gitleaks secret-scan hooks (once; needs brew install gitleaks)
npm run dev          # http://localhost:4321
```

| Command | Does |
|---|---|
| `npm run dev` | Local dev server with hot reload (drafts visible). |
| `npm run build` | Production build to `dist/` (drafts excluded). |
| `npm run preview` | Serve the built `dist/` locally. |
| `npm run deploy` | Build, then push `dist/` to the `gh-pages` branch. |
| `npm run sync-assets` | Re-pull tokens CSS + SVGs from `../earlbear-design-system`. |
| `npm run tasks-check` | Verify the task-file invariant (see CLAUDE.md). |

### Design tokens

The design system is **vendored**, not consumed as an npm package: `@earlbear/ui`
lives on GitHub Packages, whose downloads are billing-gated and currently over
the org quota (the same limit that disables Actions). `npm run sync-assets`
copies `colors_and_type.css` → `src/styles/tokens.css` and the SVG assets →
`public/vendor/` from a local design-system clone, recording the source commit in
`.sync-source.json`. Both are committed, so builds never depend on the clone.

## Deploy

There are **no GitHub Actions** here (org billing is disabled). GitHub Pages
serves the site from a `gh-pages` branch using its free built-in branch build:

```bash
npm run deploy
```

This runs `astro build` and force-pushes the contents of `dist/` to `gh-pages`.
`main` stays source-only. `public/CNAME` and `public/.nojekyll` are copied into
every build so the custom domain and raw-file serving survive each deploy.

### One-time setup

1. `npm run deploy` once to create the `gh-pages` branch.
2. **Repo → Settings → Pages → Source:** Deploy from a branch → `gh-pages` /
   `(root)`.
3. **Cloudflare DNS:** add a `CNAME` record — name `blog`, target
   `earlbear.github.io`, **DNS only (grey cloud)**. Keep it grey-clouded: GitHub
   needs to complete HTTP validation to issue and renew the TLS cert.
4. **Repo → Settings → Pages → Custom domain:** `blog.earlbear.com`. Wait for
   the DNS check and cert (minutes to ~1 hour), then enable **Enforce HTTPS**.

## Structure

```
src/
  content/blog/        markdown posts (filename = slug)
  content.config.ts    post frontmatter schema
  lib/posts.ts         published/sorted posts, tags, reading time
  layouts/             BaseLayout, PostLayout
  components/          Nav, Footer, PostCard, TagPill, FormattedDate, EarlMark
  pages/               index, blog/[...slug], tags/, about, 404, rss.xml
  styles/global.css    layout scaffolding + Shiki code-block overrides
scripts/
  sync-ui-assets.mjs   copies SVGs from @earlbear/ui into public/vendor/
public/                CNAME, .nojekyll, favicon.svg
docs/tasks/            backlog.md + done.md (durable task record)
```
