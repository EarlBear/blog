---
name: new-post
description: Scaffold a new blog post for the EarlBear blog. Use when the user says "new post", "write a blog post", "start a draft", "add a post about X", or wants to create content under src/content/blog/. Generates the slug + frontmatter, drops the file in place, and enforces house voice.
---

# New blog post

Create a well-formed post in `src/content/blog/`. The **filename is the URL
slug** (`src/content/blog/<slug>.md` → `/blog/<slug>/`), so choose it carefully —
changing it later breaks links and RSS.

## Steps

1. **Gather the essentials** (ask only for what's missing):
   - **Title** — sentence case, no emoji, no exclamation points.
   - **Description** — one or two sentences; shown in listings, RSS, and social
     previews. Also sentence case.
   - **Tags** — lowercase, existing tags where possible (check
     `src/content/blog/*.md` frontmatter for tags already in use so you don't
     fragment them).
   - **Author(s)** — one or more author ids that exist in
     `src/content/authors/`. If the named author has no file yet, use the
     `manage-authors` skill first.
   - **Draft?** — default `true` for a fresh draft (visible in `npm run dev`,
     excluded from production builds) unless the user wants it published now.

2. **Derive the slug** from the title: lowercase, spaces → hyphens, strip
   punctuation. Confirm it doesn't collide with an existing file.

3. **Get the date.** Use today's date as `pubDate` in `YYYY-MM-DD`. (Dates are
   formatted in UTC by `FormattedDate.astro`, so a plain date is fine.)

4. **Write the file** `src/content/blog/<slug>.md`:

   ```md
   ---
   title: <title>
   description: <description>
   pubDate: <YYYY-MM-DD>
   tags: [<tag>, <tag>]
   authors: [<author-id>]
   draft: true
   ---

   <opening paragraph — lead with the point>
   ```

5. **Match the schema.** Frontmatter must satisfy `src/content.config.ts`
   (title, description, pubDate required; tags/authors/draft optional with
   defaults). If you add a field the schema doesn't allow, the build fails.

6. **Voice check** before finishing: sentence case throughout, no emoji, no
   exclamation points, specific over vague, tabular numerics for figures.

7. **Preview.** Remind the user to run `npm run dev` and open
   `/blog/<slug>/`. Drafts show a "draft" marker in listings.

## Notes

- Don't set `updatedDate` on a new post; add it later when materially revised.
- Code blocks are syntax-highlighted at build (Shiki); use fenced blocks with a
  language for technical posts.
- If this post is a notable new capability rather than routine content, consider
  whether it warrants a `docs/features/` doc (usually not — feature docs are for
  code features, not individual posts).
