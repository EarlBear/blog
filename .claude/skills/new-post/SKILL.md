---
name: new-post
description: Scaffold a new blog post for the EarlBear blog. Use when the user says "new post", "write a blog post", "start a draft", "add a post about X", or wants to create content under src/content/blog/. Generates the slug + frontmatter (including the required "questions this post answers"), drops the file in place, enforces house voice, and verifies the build.
---

# New blog post

Create a well-formed post in `src/content/blog/`. The **filename is the URL
slug** (`src/content/blog/<slug>.md` → `/blog/<slug>/`), so choose it carefully —
changing it later breaks links and RSS.

The post schema is defined in `src/content.config.ts` — treat it as the source of
truth. As of now it requires `title`, `description`, `pubDate`, and **`questions`
(at least one)**; `tags`, `authors`, `updatedDate`, `draft` are optional.

## Steps

1. **Gather the essentials** (ask only for what's missing):
   - **Title** — sentence case, no emoji, no exclamation points.
   - **Description** — one or two sentences; shown in listings, RSS, and social
     previews. Also sentence case.
   - **Questions this post answers** (REQUIRED, one or more) — the questions the
     post exists to answer, usually lifted from the request that prompted it (the
     "why" behind the post). These render in a block at the top of every post, so
     phrase them as a reader would ask them. **Each must end with a `?`** and the
     list can't be empty — the `check-posts.py` hook and the build both enforce
     this.
   - **Tags** — lowercase. Reuse existing tags; list them first so you don't
     fragment:
     ```bash
     grep -h '^tags:' src/content/blog/*.md | sort -u
     ```
   - **Author(s)** — one or more author ids. List valid ids and confirm each one
     the user names exists:
     ```bash
     ls src/content/authors/        # each file stem is a valid author id
     ```
     If a named author has no file, use the `manage-authors` skill first.
   - **Draft?** — default `true` for a fresh draft (visible in `npm run dev`,
     excluded from production builds) unless the user wants it published now.

2. **Derive and check the slug.** Lowercase the title, spaces → hyphens, strip
   punctuation. Confirm it doesn't collide:
   ```bash
   ls src/content/blog/<slug>.md 2>/dev/null && echo "COLLISION — pick another slug" || echo "slug is free"
   ```

3. **Date.** Use today's date as `pubDate` in `YYYY-MM-DD` (formatted in UTC by
   `FormattedDate.astro`, so a plain date is correct). Don't set `updatedDate` on
   a new post.

4. **Write** `src/content/blog/<slug>.md` — frontmatter plus a real body scaffold
   (don't leave it empty; give the author structure to fill in), matching the
   house shape of `hello-world.md`:

   ```md
   ---
   title: <title>
   description: <description>
   pubDate: <YYYY-MM-DD>
   tags: [<tag>, <tag>]
   authors: [<author-id>]
   questions:
     - <a question this post answers>
     - <another question this post answers>
   draft: true
   ---

   <Lede: one or two sentences that lead with the point — the reader should know
   what they'll get before the first heading.>

   ## <First section kicker>

   <Body. Sentence case, specific over vague, tabular numerics for figures.>

   ## <Second section kicker>

   <For technical posts, use a fenced block with a language so Shiki highlights it:>

   ```ts
   // example
   ```
   ```

   Section `##` headings render as uppercase accent kickers (see
   `src/styles/global.css` `.prose h2`), so keep them short.

5. **Voice check**: sentence case throughout, no emoji, no exclamation points,
   specific over vague, tabular numerics for figures.

6. **Validate, then build** before finishing:
   ```bash
   npm run posts-check   # fast frontmatter + voice check (questions end in ?, authors exist, lowercase tags, no emoji/!)
   npm run build         # authoritative: zod schema in src/content.config.ts
   ```
   Then preview: `npm run dev` and open `/blog/<slug>/`. Confirm the byline, the
   "Questions this post answers" block, and any code blocks render. Drafts show a
   "draft" marker in listings and are excluded from the production build.

## Notes

- Add `updatedDate` later, only when a post is materially revised.
- Individual posts do **not** get a `docs/features/` why-doc — those are for code
  features, not content. (The post's own `questions` field already captures its
  "why".)
