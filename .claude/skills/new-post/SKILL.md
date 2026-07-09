---
name: new-post
description: Scaffold a new blog post for the EarlBear blog. Use when the user says "new post", "write a blog post", "start a draft", "add a post about X", or wants to create content under src/content/blog/. Generates the slug + frontmatter (including the required "questions this post answers"), infers the author from the machine username, web-verifies factual claims and cites them as MLA footnotes, enforces house voice, and verifies the build.
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
   - **Author(s)** — one or more author ids. If the user doesn't name an author,
     infer the default from the machine username and match it against the known
     authors:
     ```bash
     whoami                         # e.g. omareid → author id "omar"
     ls src/content/authors/        # each file stem is a valid author id
     ```
     Match on the id, the `name:` field, or git's `user.name`. If the username
     matches no known author, do NOT guess — use the AskUserQuestion tool to ask
     whether to add a new author (via the `manage-authors` skill) or attribute
     the post to an existing one.
   - **Draft?** — default `true` for a fresh draft (visible in `npm run dev`,
     excluded from production builds) unless the user wants it published now.
   - **Expects** (optional) — the visual(s) this post should carry, by kind:
     `expects: [comparison]` for an options-comparison post (owes a
     `<ComparisonMatrix>`), `flow` (a `<FlowDiagram>`), `use-case`, or `decision`
     (an `<Accordion>`/matrix). Declaring it makes the post's promise explicit; a
     non-blocking `expects-check` warns if the visual is missing. Use it whenever
     the post's *type* implies a visual — a comparison without a matrix is a wall
     of prose pretending to compare.

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

5. **Verify and cite every claim — numbers require footnotes.** Facts must not
   come from memory: WebSearch each factual claim (prices, salaries, benchmarks,
   statistics, dates) and cite what you verified. The rules, enforced by
   `check-posts.py`:
   - Any paragraph (or table) containing a **dollar amount or percentage** must
     carry a footnote reference (`[^id]`).
   - Externally sourced figures get a **true MLA citation** as the footnote
     definition: `[^id]: Author Last, First. "Title of Page." *Site Name*,
     year (or n.d.), URL.` — quoted title, italic container, year or `n.d.`,
     trailing period. The validator checks this shape on any definition that
     contains a URL.
   - Figures **computed inside the post** (a worked example, calculator
     defaults) get an explanatory footnote instead — e.g. `[^derived]: Derived
     figure — computed from the cited inputs above.` (no URL → MLA shape not
     required). Never dress a derived number up as a sourced one.
   - Every reference needs a definition and vice versa. Footnotes are GFM
     syntax and render automatically as a footnotes section at the end.

6. **Voice check**: sentence case throughout, no emoji, no exclamation points,
   specific over vague, tabular numerics for figures. The full quality standard —
   anti-fluff, no anthropomorphizing, the design-post skeleton (requirements /
   personas / impact / use cases), and right-component usage — lives in the
   **`design-post-review`** skill; don't restate it here, run it in step 8.

7. **Validate, then build** before finishing:
   ```bash
   npm run posts-check   # fast frontmatter + voice + citation check
   npm run build         # authoritative: zod schema in src/content.config.ts
   ```
   Then preview: `npm run dev` and open `/blog/<slug>/`. Confirm the byline, the
   "Questions this post answers" block, and any code blocks render. Drafts show a
   "draft" marker in listings and are excluded from the production build.

8. **Review the post** — run the **`design-post-review`** skill against the new
   post. It is the single home for the quality standards (visual polish, right
   diagram/component for the job, and content/architecture substance) and it
   audits + iterates. This is where a design post earns its skeleton (requirements,
   personas, impact, use cases) and its anti-fluff pass — so this skill stays a
   scaffolder and doesn't duplicate those rules.

## When the validation hook blocks

`check-posts.py` runs automatically after every Write/Edit to a post (PostToolUse
hook) and blocks with a `BLOCKED: post validation failed` message listing each
violation with its fix. When that happens:

1. Read the violations — they name the file, the rule, and the offending value.
2. Fix the post (frontmatter, voice, or citations), don't fight the hook: never
   bypass it by editing `.claude/settings.json`, weakening `check-posts.py`, or
   moving the file out of `src/content/blog/`.
3. Re-save; the hook re-runs on the next edit. Confirm clean with
   `npm run posts-check`.
4. Mid-refactor noise is normal — e.g. adding `[^ref]`s before their definitions
   exist will block until the definitions land. Finish the edit sequence, then
   verify.
5. If a rule itself is wrong (false positive), stop and raise it with the user
   instead of working around it.

## A picture is worth a thousand words

This is a blog tenet, not a nicety: **interleave visuals; never ship a wall of
text.** As you draft, whenever a section describes a *structure* — a flow, a loop,
a boundary, a decision, who-does-what — stop and ask whether a diagram carries it
better than the next three paragraphs. It almost always does. The diagram catalog
(`enrich-post` skill) has a technique for each; embedding one is cheap. A
non-blocking `visuals-check` warns when a section runs long with no visual — treat
that warning as a prompt to reach for the catalog, not noise to ignore.

## Interactive widgets and charts

Posts may embed plain HTML/CSS/JS directly in the markdown (calculators, charts —
see `life-without-earlbear.md` for a worked example: a CSS gantt + a cost
calculator). Rules:

- Keep each raw-HTML block **free of blank lines** (a blank line ends the HTML
  block and markdown parsing resumes), including `<style>`/`<script>` contents.
- **Footnote refs do not render inside a raw-HTML block.** A `[^id]` placed
  inside `<figure>`, `<div>`, `<table>`, etc. renders as literal `[^id]` text,
  not a citation — markdown skips its inline processing inside HTML blocks. Put
  the citation on the **markdown sentence that introduces** the component (e.g.
  the paragraph before a chart), not on the values inside it. `check-posts.py`
  now flags trapped refs, but the fix is always "move the ref into the prose."
- Style with **semantic design-system tokens only** — never raw hex. Single
  light theme.
- Diagrams (flow, loop, pipeline, use-case, decision): use the `enrich-post` skill
  and its catalog — the blog has zero-dep diagram components (`FlowDiagram`,
  `UseCaseDiagram`, `Accordion`) that render inline SVG at build time and pass
  blocking layout gates. Prefer these over hand-rolled diagram markup.
- Charts (bars, ranges, calculators): use the vendored categorical palette
  `--eb-data-1..8` in fixed order against the ivory surface. Known-good trio:
  `--eb-data-1`, `--eb-data-3`, `--eb-data-4`. See the salary chart in
  `life-without-earlbear.md` for a worked example.
- Figures in widgets use `.num` (tabular numerics); text never wears the data
  color.
- Scope all selectors under one wrapper class so post styles can't leak (styles
  in markdown are global).

## Tables vs. HTML components

Markdown tables (`| … | … |`) are styled globally (`src/styles/global.css`
`.prose table`: cell padding, header rule, row separators, horizontal scroll).
They are right for **plain tabular facts** — a few columns of short text or
numbers. Reach past them when:

- **A column encodes a quantity you could show as a bar or range.** A salary
  band like `$130k–$185k` is a range on a shared axis — a bar with a median dot
  reads far better than text, and text ranges wrap mid-value. Build an HTML
  component instead (see the salary chart in `life-without-earlbear.md`).
- **A cell is a small enumerated state** (RACI R/A/C/I, status, yes/no). Use
  distinct badges, not bare letters — colour + shape carries the state at a
  glance and the columns stay aligned. (RACI grid, same post.)
- **Long text in a cell forces awkward wrapping.** Move it out of the table
  (a caption, a definition list, or a component with a dedicated text column).

One thing a table must never do: mix distinct kinds of data in one column (e.g.
the hiring bar *and* the responsibilities of a role). Split them into separate
tables or a table plus a component — one concept per column.

## Verify the render, not just the source

`check-posts.py` reads the markdown **source**; it cannot see the rendered
pixels. Spacing, column crowding, wrapping, a bar overrunning its label, a
footnote that rendered literally — these only show up in the browser. So after
any post with a table, chart, or widget: run `npm run dev`, open the post, and
**look at it** (or screenshot it — the `visual-site-review` skill is built for
this). Fix visual issues in the component's CSS or the global table styles, not
by contorting the content. The hook and the build are necessary, not sufficient.

## Back a performance or design claim with evidence

If the post asserts that one approach is faster, lighter, or better than another
(e.g. "inline SVG is lighter than an image", "the animation is free"), don't state
it from intuition — cite a measurement. Run or point to an A/B/perf comparison
(the `frontend-audit` skill covers *when* a claim warrants a test and *how* to run
and document one), write the numbers to a regenerable `docs/<thing>-bench.md`, and
reference the result in the post's prose. See `earlbear-use-cases.mdx` +
`docs/diagram-bench.md` for the shape. A claim a reader can't trace to a
re-runnable table is a vibe, not a finding.

## Notes

- Add `updatedDate` later, only when a post is materially revised.
- Individual posts do **not** get a `docs/features/` why-doc — those are for code
  features, not content. (The post's own `questions` field already captures its
  "why".)
