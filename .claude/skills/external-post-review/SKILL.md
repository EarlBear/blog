---
name: external-post-review
description: Review an EXTERNAL (public) blog post for over-sharing proprietary "secret sauce" — passages to SOFTEN so the post stays confidence-building without becoming a handbook a competitor could use to clone EarlBear. Use when the user asks to "review a post for what it gives away", "check we're not leaking secret sauce", "is this too much detail for public", "soften the how-to", or before publishing a technical external post. This is a section-level EDITORIAL pass on a correctly-public post — it recommends softer rewrites, not audience moves. For the binary "should this whole post be internal vs external" call, use the audience-audit skill instead.
---

# Review external posts for over-shared "secret sauce"

An external post can be **correctly public** and still give away too much. This
skill is the editorial pass that reads a public post section by section and asks:
does any passage cross from *storytelling* into a *reproducible recipe* a competitor
could follow? Where it does, it proposes a softer rewrite that keeps the marketing
value.

## What this is (and is not)

Three layers protect the two-audience split; keep them straight:

| Concern | Owner |
|---|---|
| A *declared* internal post can't leak to the public build | `check-audience.py` + deploy gate (mechanism) |
| Is this *whole post* labeled to the right audience? | **`audience-audit`** skill (classification) |
| Within a correctly-public post, does any *section* over-share? | **this skill** (content) |

So: if the post shouldn't be public at all, that's `audience-audit` — move it. If the
post *should* be public but a few passages hand over the moat, that's here — **soften
those passages**. The two are complementary; when a review finds a post that's really
an internal engineering doc in disguise, hand it to `audience-audit` for the move.

## The editorial stance

External posts exist to **build confidence and lightly sell** — show competence,
taste, and results. They are **not** a step-by-step handbook another engineer could
use to clone EarlBear's edge.

**Share freely (the pitch):**
- The *why* — the problem, the stakes, the decision behind an approach.
- *Outcomes* — what got better, what we learned, the shape of the result.
- *Principles* — the reusable idea at a level you'd happily show a customer.
- Architecture *at a storytelling altitude* ("we split reads and writes"; "an
  append-only log we replay").

**Hold back (the moat) — flag for softening:**
- **Exact mechanism**: verbatim LLM prompts, full config/manifests, precise
  algorithms or formulas presented copy-paste-ready.
- **Tuning knobs as numbers**: the specific thresholds, temperatures, timeouts,
  token/row/QPS limits, weights that make it work. State the *principle*, not the
  dialed-in value.
- **Internal economics**: unit costs, margins, infra spend/capacity figures.
- **Unreleased specifics** and **security-sensitive detail** described precisely
  enough to probe or reproduce.

**Not a leak — don't over-flag:**
- Techniques that are already open-source or industry-common knowledge.
- Deliberate thought-leadership we *want* to be known for.
- A code sample that illustrates a shape without being the whole recipe.

The test for a passage: *would a competitor, reading only this, be able to reproduce
our advantage?* If yes → soften. If it just makes us look like we know what we're
doing → keep.

## Process

1. **Scope to external posts.** This applies only to posts that will be public
   (`audience: external`). Internal posts can share freely.

2. **Run the fast pass:** `npm run secret-sauce-check`
   (`.claude/hooks/check-secret-sauce.py`). It scans external posts for tells —
   verbatim-prompt blocks, large config blocks, recipe framing ("the trick is…"),
   exact tuning values, internal cost figures — and prints candidates per post. It
   is **advisory and over-flags on purpose**; a clean pass is not a guarantee, and a
   flagged line is a candidate, not a verdict.

3. **Read and judge each candidate (and skim the rest).** For every flagged passage,
   decide: keep, or soften — and say why in one line (which moat category it hits, or
   why it's actually safe). The check narrows the field; you make the call.

4. **Propose a softer rewrite that preserves the pitch.** Don't just delete — rewrite
   so the section still lands as competent and compelling, minus the reproducible
   detail. Examples of the move:
   - *Verbatim prompt* → describe what the prompt asks for and why, not its text.
   - *"We set the threshold to 0.82"* → "we tuned a confidence threshold — high
     enough to avoid false alarms, low enough to still catch real breaks."
   - *Full YAML config* → the two or three settings that make the point, framed as
     choices, not a paste-ready file.
   - *"$0.004/request, 63% margin"* → "cheap enough to run on every request" (drop
     the economics).

5. **If a post is really internal, escalate — don't just soften.** When softening
   would gut the post, the post is an internal engineering doc wearing a blog
   costume. Stop and run **`audience-audit`** to move it (`audience: internal`)
   rather than watering it down to nothing.

6. **Produce a report**, most-severe first, per finding:
   `{ file, section/excerpt, category (prompt / config / algorithm / tuning /
   economics / roadmap / security), why it's sensitive, suggested softer rewrite }`,
   and an overall verdict per post: **ship** / **soften-then-ship** / **move to
   internal (→ audience-audit)**.

7. **Apply only on approval.** Edit the post's prose to the softer version once the
   author agrees. Then re-run `npm run secret-sauce-check` and, before any public
   deploy, the audience gate (`npm run build:external && npm run audience-check`).

## When to run

- **Before publishing a technical external post** — especially anything about the
  agentic workflow, prompts, the telemetry/self-healing internals, or infra.
- **After `audience-audit`** decides a post *is* external — this is the next, finer
  pass: right audience, now right level of detail.
- **When a draft leans deep** — if you catch yourself writing the exact how, run this
  before it ships.

## Notes

- This is judgment, not automation. The hook surfaces tells; a human decides what's
  moat vs. marketing and writes the softer line.
- Bias: over-flagging is cheap (a passage gets a second look); under-flagging is the
  costly, one-way mistake (a competitor got the recipe). When genuinely unsure
  whether a detail is moat, soften it or ask.
- Cross-links: `audience-audit` (classification), `docs/features/audience-split.md`
  (the machinery), `new-post` (write it right the first time).
