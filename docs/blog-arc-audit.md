# Blog arc audit — the missing on-ramp

Reader-perspective audit of all 31 posts, run 2026-07-13 via the `reader-review`
skill: six parallel cold-reader agents (a smart engineer new to EarlBear, zero prior
context), each reading a thematic cluster in order and applying the seven story
checks, plus one arc-mapping pass. This file is the durable deliverable; it feeds the
foundational "start here" post.

## The one finding, six times over

**No post ever states, in prose, what EarlBear is — the product, the business, or the
stack — before diving in.** Every post is a dispatch from inside the system that
assumes the reader already holds the whole. Read independently, all six clusters
converged on this same root cause. The picture only assembles if you read many posts
and reverse-engineer it:

- EarlBear's **product** = self-healing Shopify storefronts: an agent runs A/B
  experiments and ships conversion wins as a managed service (self-healing cluster).
- Its **go-to-market** = an agent that scans ecommerce sites for growth problems and
  generates leads (scanner cluster).
- It runs as a **loop of agents** (scan → outreach → onboard → review/enhance → back),
  and those agents are **Claude Code sessions whose transcripts are the telemetry**
  behind an internal dashboard (foundation + telemetry clusters).
- The **stack** = static Astro sites (no backend) on a CDN, behind **Cloudflare
  Access** (Google SSO, `@earlbear.com`), talking **directly to one Supabase Postgres**,
  with **RLS as the only authorization layer**; a two-build split ships a keyless
  static artifact and a live token-carrying app (identity + craft clusters).

None of that is stated up front anywhere.

## Where the reader first falls off

- **Foundation cluster:** blocking at `from-one-laptop-to-the-cloud`, sentence 2 —
  "the telemetry pipeline behind our agent dashboard." The decoder ring ("agents =
  Claude Code sessions → transcripts → telemetry") doesn't arrive until the *last
  sentence of `agentic-workflow-that-runs-earlbear`*, two posts later in read order.
- **Identity cluster:** the architecture premise a reader needs ("static site, no
  backend, talks to Supabase directly, CF Access already logged them in, RLS decides
  who the caller is") is stated cleanly — but only in the **first paragraph of the
  4th post**, `the-proxy-and-the-passport`. That paragraph *is* the missing on-ramp,
  buried mid-arc.
- **"mart" specifically:** the title-noun of `the-two-marts…` and a core term in the
  pitch-deck post, yet its only definition anywhere is buried inside a diagram-node
  `detail` attribute in `a-pitch-deck-that-reads-its-own-numbers`.
- **Public post (`self-healing-storefront`, the one external technical post):** never
  names the vendor ("an operator (us)") and references "the scanner" companion product
  with **nowhere for an outside reader to go** — the scanner posts are internal/draft.

## The intended arc vs. what exists

User's intended arc → covering posts:

| Arc stage | Posts | Status |
|---|---|---|
| 0. Who we are (product/business) | life-without-earlbear, agentic-workflow, earlbear-use-cases, self-healing + scanner deep-dives | **Scattered** — no single "here is EarlBear" |
| 1. A static site (the stack itself) | hello-world | Partial — covers the *blog's* build, not the whole surface |
| 2. Wanted it DB-backed + demos | mining-transcripts, one-database-two-modes, from-one-laptop, what-we-never-collect, syncing-transcripts, realtime-fleet | Covered (heavily) |
| 3. Cloudflare in front | the-login-page-we-didnt-build, the-logout-button | Covered |
| 4. Supabase behind | supabase-as-an-api, reporting-mcp-supabase-mode, from-one-laptop | Covered |
| 5. Real login experience (identity into RLS) | who-are-you-to-supabase, the-proxy-and-the-passport | Covered |
| 6. Lock down who can WRITE | the-two-marts (identity-gated marts), supabase-as-an-api, every-key, realtime-fleet | Covered |

**Stages with no dedicated post:** 0.5 "what EarlBear is, in one place"; the
stack-at-a-glance architecture overview; the internal/external audience-split
rationale; the "static site → why add a database" motivation beat.

## Load-bearing terms defined nowhere (or only in a diagram detail)

`mart` · `the scan fleet` · `the snapshot builder` · `the two-build split`
(`build:live` / `build:static`) · `the MCP reporting server` / writer ·
`the agent dashboard` · `abacus` (telemetry namespace). Each recurs across multiple
posts as settled vocabulary.

## Standing on-ramp assets that already exist

- **`src/pages/about.astro`** — establishes the *product* ("websites that build, host,
  and heal themselves") but names **zero stack** and never mentions the two-audience
  split. It's product-marketing, not an engineering on-ramp, and it's a standing page
  a post-arriving reader never sees.
- **`the-proxy-and-the-passport` ¶1** — the best existing statement of the stack
  premise; the "start here" post is essentially an expansion of it.
- **`who-are-you-to-supabase`** — already the correct link target for the *auth* half
  of the on-ramp (comments + marts posts correctly link it). The **data/system-overview
  half is missing entirely.**

## Recommendation

**One new foundational post that doubles as a reading-order index, plus a link from
`about.astro` to it.** Not the About page alone (it can't carry a stack diagram or a
reading order without becoming a second thing).

- **Working title:** "Start here: what EarlBear is, and the stack this blog is written
  from"
- **Audience:** intro is external-safe; deep links fan out to internal posts. (Decide
  external-overview vs internal per whether the stack diagram reveals internal arch.)
- **Sections:**
  1. What EarlBear is — self-healing storefronts run as a loop of agents (2 sentences)
     → agentic-workflow, earlbear-use-cases, life-without-earlbear.
  2. What this blog/site is — a zero-JS Astro static site that also hosts live demos
     and internal dashboards → hello-world.
  3. The stack at a glance — one FlowDiagram: static build → Cloudflare Access →
     browser-direct-to-Supabase → RLS. One link per layer, presented as the reading
     order through stages 2→6.
  4. Two audiences, one blog — external (customers) vs internal (engineering
     dispatches), the two-build model → internal-only-example.
  5. Where to go next — the ordered reading list, grouped by arc stage.
- **Define once, here (or in a glossary the post owns):** mart, scan fleet, snapshot
  builder, two-build split, agent dashboard — so every other post can link one term
  instead of re-glossing.
- Then a light per-post pass: each deep post adds one on-ramp link to this post in its
  first paragraph (the fix is a link, not re-explanation).

## Per-post verdicts (most-reader-blocking first within each cluster)

- **NEEDS-ON-RAMP:** from-one-laptop-to-the-cloud, reporting-mcp-supabase-mode,
  every-key-in-the-system, a-pitch-deck-that-reads-its-own-numbers, realtime-fleet-no-backend.
- **FIXABLE-GAPS:** hello-world, one-database-two-modes, who-are-you-to-supabase,
  supabase-as-an-api, the-two-marts (now best-mitigated of the deep ones — links two
  siblings, explains its own two-build split; only whiffs on defining "mart" itself),
  comments-that-anchor, agents-that-report, consolidating-telemetry-with-drive,
  mining-transcripts, self-healing-storefront (PUBLIC — name the vendor, resolve the
  scanner reference), earlbear-use-cases, one-engine-two-renderers.
- **FOLLOWS (self-standing):** life-without-earlbear, agentic-workflow,
  the-logout-button, the-proxy-and-the-passport (best cold open — the model to copy),
  what-we-never-collect, scrubbing-secrets-and-pii, embedding-charts (best standalone),
  syncing-transcripts, ecommerce-site-scanner, ecommerce-site-scanner-design,
  self-healing-storefront-design, internal-only-example (fixture — flag for deletion).

## Also surfaced (not on-ramp, worth noting)

- `internal-only-example.md` is a self-described test fixture — flag for deletion once
  the audience split is verified.
- Reading order within clusters is often pedagogically backwards (e.g. telemetry:
  `what-we-never-collect` defines "the rule" the others assume, but comes third).
- The scanner ↔ self-heal pairing is name-dropped across 4 posts but never
  cross-linked, so the arc is invisible in the render.
