---
name: reader-review
description: Read a blog post as a first-time reader would and find where the story breaks — the on-ramp gaps, the unexplained leaps, the undefined terms, the "wait, what is this built on?" moments that lose someone encountering the system cold. Use when the user says "review this post as a reader", "does this post make sense to someone new", "where would a reader get lost", "is the story sound", "does this follow", or "this throws the reader in the deep end". This is a NARRATIVE-COMPREHENSION pass — it judges whether the post carries the reader, not whether it's polished, on-voice, or correctly scoped. For visual/component quality use design-post-review; for public over-sharing use external-post-review; for internal-vs-external use audience-audit.
---

# Read a post as a first-time reader (find where the story breaks)

Every post on this blog is written by someone deep in the system, for a reader who
is not. The failure mode is not bad prose — it's a post that is *correct, polished,
and impossible to follow* because it assumes context the reader was never given. It
drops them into the middle of a system, names things it never introduced, and makes
leaps that are obvious to the author and invisible to the reader.

This skill is the pass that reads the post **as that first-time reader** and marks
every place the thread breaks. It does not fix voice, visuals, or scope — it fixes
**comprehension**: can a smart newcomer follow this from the first line to the last
without falling off?

## What this is (and is not)

Keep the review lanes straight — do NOT redo a sibling skill's work here:

| Concern | Owner |
|---|---|
| Visual polish, right diagram, component correctness | `design-post-review` |
| Public post over-shares "secret sauce" | `external-post-review` |
| Is this post the right audience (internal vs external)? | `audience-audit` |
| Perf / a11y / SEO / bundle | `frontend-audit` |
| Frontmatter + brand voice (sentence case, no emoji, `questions` present) | `check-posts.py` |
| **Does the story hold for a cold reader — no gaps, no unexplained leaps?** | **this skill** |

So: this skill assumes the post is on-voice, correctly-scoped, and well-illustrated,
and asks only — **does it carry the reader?** If a post reads beautifully to someone
who already knows the system and is a wall of unexplained references to everyone else,
that is exactly the defect this skill exists to catch.

## The reader you are playing

Read the post as a **smart engineer new to EarlBear** — competent, but with *zero*
prior context on this specific system. They know Postgres, HTTP, JWTs in general; they
do **not** know what a "mart" is here, what "the scan fleet" is, what CF Access is
doing in front of the site, or which post they were supposed to read first. They will
not go dig — if the post doesn't carry them, they bounce.

Read top to bottom **once, in order**, and mark the first moment you'd be confused if
you knew nothing. Do not "read ahead to figure it out" — the reader can't either.

## The seven story checks

Walk the post and flag each place it fails one of these:

1. **The cold open.** Does the first paragraph orient the reader, or drop them
   mid-system? A post should establish *what this is about and why it matters* before
   it dives. "The two dashboard panels read empty…" — which dashboard? what panels?
   read empty *for whom*? If the reader needs paragraph 4 to understand paragraph 1,
   the open is broken.

2. **Undefined terms.** Every piece of jargon that is *local to EarlBear* must be
   introduced on first use (or linked to the post that introduces it). "mart",
   "the scan fleet", "the snapshot builder", "the two-build split", "CF Access",
   "the publishable key" — each is a term a newcomer does not have. Generic industry
   terms (RLS, JWT, 404) are fine unlisted.

3. **The unexplained leap.** A step in the argument the author treats as obvious that
   the reader can't make. "So we split the build into two" — *why does that follow?*
   "The advisor can't see it" — *why not?* Every "so", "therefore", "which means"
   is a leap; check the reader can actually make it from what's on the page.

4. **The missing on-ramp.** Does the post assume a system the reader was never
   introduced to, with no link to where they'd learn it? This is the big one for this
   blog. A post about gating marts that never says what the site *is*, what it sits on
   (static build? Cloudflare? Supabase?), or why any of it exists, throws the reader
   in the deep end. Either introduce it briefly or **link the foundational post** that
   does.

5. **Narrative soundness.** Does the post have a spine — a question it opens, tension
   it builds, and a resolution it lands — or is it a pile of true facts in arbitrary
   order? A reader follows a *story*, not a spec. If sections could be reordered with
   no loss, there is no spine.

6. **Answers its own questions.** Every post declares a `questions:` list (the
   questions it was written to answer). Read them, then check the body actually
   answers *each one*, in a way the reader could point to. A declared question with no
   discernible answer is a broken promise to the reader.

7. **The landing.** Does the ending give the reader somewhere to stand — the takeaway,
   what to do with it, where to go next — or does it just stop? A post that ends
   mid-detail leaves the reader unsure what they were supposed to keep.

## Process

1. **Preview the real render, in order.** `PUBLIC_AUDIENCE=internal npm run dev`
   (internal posts only render in the internal build; see the `run-blog-locally`
   skill). Read the *rendered* post top to bottom — the questions block, the prose,
   the diagrams in place. The reader sees the render, not the source.

2. **Run the fast pass:** `npm run reader-check`
   (`.claude/hooks/check-reader-flow.py`). It flags mechanical tells — an EarlBear-local
   term used before it's introduced or linked, a `questions:` entry whose keywords never
   reappear in the body, a very long run of prose with no orienting sentence. It is
   **advisory and over-flags on purpose**; a clean pass is not a guarantee (checks 1, 3,
   5, 7 are judgment a scanner can't make), and a flagged term is a candidate, not a
   verdict.

3. **Do the read as the cold reader.** Walk the seven checks top to bottom. For each
   break, note: *where* (section / line), *which check* it fails, and *what the reader
   doesn't have* at that point. Stop at the first break in each section — don't
   rationalize past it with knowledge the reader lacks.

4. **Produce a report**, most-reader-blocking first, per finding:
   `{ file, section/excerpt, check (cold-open / undefined-term / leap / on-ramp /
   soundness / unanswered-question / landing), what the reader is missing, suggested
   fix }`. End with an overall verdict per post: **follows** / **fixable gaps** /
   **needs an on-ramp** (a foundational post/section the reader must read first, which
   may not exist yet — hand that to the blog-arc audit).

5. **Fix on approval — introduce, don't assume.** The fix for most breaks is *additive*:
   a sentence that introduces the term, a clause that justifies the leap, a link to the
   foundational post, an opening that orients. Prefer a link over a re-explanation when a
   sibling post already establishes the thing (don't duplicate — connect). Re-read the
   patched section as the cold reader to confirm the break is gone. Keep
   `npm run posts-check` green.

## When to run

- **After `new-post` / `enrich-post` / `design-post-review`** — once the post is
  on-voice and well-illustrated, this is the pass that asks if a newcomer can follow it.
- **When a post "throws the reader in the deep end"** — the exact symptom this catches.
- **Across the whole blog, to find on-ramp gaps** — running it post-by-post surfaces
  which foundational context is missing entirely (no post introduces the site's origin,
  the stack, the audience split). That map is the input to writing the central "start
  here" post. This is the blog-arc audit.

## Notes

- This is judgment, not automation. The hook surfaces undefined-term and
  unanswered-question tells; a human decides where the *story* actually breaks (the
  cold open, the leap, the spine, the landing are not greppable).
- Bias: over-flagging is cheap (a term gets an intro sentence); under-flagging is the
  costly mistake (a reader silently bounces and you never hear about it). When unsure
  whether a newcomer has a term, introduce or link it.
- The recurring finding on this blog is the **missing on-ramp** (check 4): posts are
  written as dispatches from inside a system with no shared "here's the whole thing"
  they can lean on. When many posts fail check 4 the same way, the fix isn't per-post —
  it's one foundational post they all link back to.
- Cross-links: `design-post-review` (quality/visuals), `external-post-review`
  (over-sharing), `audience-audit` (classification), `new-post` (write it carrying the
  reader the first time), `run-blog-locally` (preview the internal build).
