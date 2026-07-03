---
name: manage-authors
description: Add or edit blog authors for the EarlBear blog. Use when the user says "add an author", "new author", "update my author profile", "edit <name>'s bio", or wants to change who can be credited on posts. Writes src/content/authors/<id>.md and keeps post bylines valid.
---

# Manage authors

Authors are a content collection: one file per author at
`src/content/authors/<id>.md`. The **filename stem is the author id** that posts
reference in their `authors:` frontmatter (e.g. `omar`, `sad`). Bylines render
"By Omar and Sa'd" and link to `/authors/<id>/`.

## Adding an author

1. **Choose the id** — a short kebab/lowercase stem, ASCII only (it becomes a URL
   at `/authors/<id>/`). The display `name` can have apostrophes/accents; the id
   should not (e.g. name "Sa'd" → id `sad`).

2. **Gather fields** (ask for what's missing):
   - `name` — display name (required).
   - `role` — title, e.g. "Chief Builder Bear" (optional).
   - `avatar` — image path (optional). Default to `/vendor/earl-mark.svg` (the
     tinted Earl mark) until a real portrait exists.
   - `socials` — any of `github`, `x`, `bluesky`, `discord`, `website`. Use a
     real URL, or omit / `'#'` as a placeholder (placeholders are hidden on the
     author page).
   - Bio — a short paragraph for the doc body (sentence case, no emoji, no
     exclamation points).

3. **Write** `src/content/authors/<id>.md`:

   ```md
   ---
   name: <name>
   role: <role>
   avatar: /vendor/earl-mark.svg
   socials:
     github: '#'
     x: '#'
   ---

   <one-paragraph bio>
   ```

4. **Match the schema** in `src/content.config.ts` (`authors` collection): `name`
   required; `role`, `avatar`, `socials` optional. Unknown fields fail the build.

## Editing an author

- Edit the frontmatter/bio in `src/content/authors/<id>.md`.
- **Do not rename the file** unless you also update every post that references
  the old id — the id is the URL and the byline key. If a rename is required,
  grep `src/content/blog/*.md` for `authors:` and update all matches.

## Validate

- Every id used in a post's `authors:` must have a file here. A missing id logs a
  build warning (`[authors] post references unknown author id …`) and is dropped
  from the byline — check the build output.
- Quick audit: list author files (`ls src/content/authors/`) and grep posts for
  `authors:` to confirm every referenced id resolves.
- `npm run build` then visit `/authors/` and `/authors/<id>/` to confirm the card
  and archive render (an author with zero posts is hidden from the index but the
  `/authors/<id>/` page still exists).

## Notes

- The avatar renders in an accent-soft circle; a `currentColor` SVG (like
  `earl-mark.svg`) inherits the accent tint. A raster portrait just fills the
  circle.
- Byline order follows the post's `authors:` array order, not the authors here.
