---
name: frontend-audit
description: Audit and optimize the EarlBear blog from a frontend perspective — performance, accessibility, SEO, bundle weight, and mobile-friendliness. Use when the user says "audit the site", "optimize the frontend", "check performance", "is this mobile-friendly", "run lighthouse", "make it faster", or wants a health check before/after a change. Local and advisory: it measures the built site with a headless Chrome (no new deps, no CI), produces a ranked report, and proposes fixes in two tiers — functional-equivalent (safe to apply on approval) and behavior-shifting (recommend only). Also decides WHEN a change warrants an A/B test and how to gather + document the evidence. Never edits without an explicit go-ahead.
---

# Frontend audit

Measure the blog, rank what's worth fixing, and — when a decision is contested —
prove it with evidence instead of taste. This skill is **local and advisory**: it
drives a headless Chrome you already have, adds no dependencies, and never runs in
CI (org billing is off). It **proposes**; you approve.

## Guardrails

- **Never edit without approval.** Produce the report first. Apply changes only
  after the user picks which ones.
- **Two tiers, always separated:**
  - **Tier 1 — functional-equivalent:** behavior-preserving. Same rendered
    output, same behavior, fewer bytes / fewer requests / better a11y semantics.
    *Safe to apply once approved.*
  - **Tier 2 — better-practice (behavior-shifting):** changes what the page does
    or looks like, even slightly. *Recommend only — never auto-apply.* The user
    decides these one by one.
- **Measure the built site, not dev.** `npm run build && npm run preview` — dev
  ships unminified, HMR-injected, drafts-included output that misrepresents
  production. (Exception: auditing a *draft* page, which only exists in dev.)
- **Report what you dropped.** If you cap the audit (top pages only, one viewport,
  skipped a slow trace), say so. A silent cap reads as "all clear" when it isn't.

## How to measure (headless Chrome over CDP, no deps)

The repo has Google Chrome installed and needs no test framework. Drive Chrome
directly. `scripts/diagram-bench.mjs` is a **working reference** for this exact
pattern (launch headless Chrome with `--remote-debugging-port`, connect over the
DevTools Protocol using Node's built-in `WebSocket` via
`node --experimental-websocket`, emulate a viewport, evaluate in-page). Reuse it.

1. **Build + serve:**
   ```bash
   npm run build && npm run preview   # preview serves dist/ (default :4321)
   ```
2. **Launch headless Chrome** with a temp profile and remote debugging:
   ```bash
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
     --headless=new --disable-gpu --remote-debugging-port=9333 \
     --user-data-dir="$(mktemp -d)" about:blank &
   ```
3. **Audit each key page on desktop AND mobile.** Mobile-friendliness is a
   first-class dimension here — emulate a phone viewport
   (`Emulation.setDeviceMetricsOverride`, e.g. 390×844, `mobile:true`,
   `deviceScaleFactor:2`) as well as desktop (1280×900).

Prefer the **Chrome DevTools MCP tools** when they're available and not blocked by
a running Chrome profile (`lighthouse_audit`, `performance_start_trace` /
`performance_stop_trace`, `performance_analyze_insight`, `list_network_requests`,
`resize_page`). Fall back to the raw-CDP script pattern (as the bench does) when
the MCP can't attach.

## What to check

Collect findings across these dimensions; attach the **measured number** to each.

- **Performance:** FCP / LCP, main-thread long tasks, total transfer weight,
  render-blocking resources, unused CSS/JS.
- **Mobile:** no horizontal overflow at ≤390px (scan for any element whose right
  edge exceeds the viewport — the diagram bench and this skill both use a
  `getBoundingClientRect().right > clientWidth` sweep), tap-target sizing, legible
  text without zoom.
- **Accessibility:** color contrast against the design tokens, image/SVG alt or
  `role="img"`+`<title>`, heading order, keyboard focus visibility, reduced-motion
  honored.
- **SEO / metadata:** `<title>`, meta description, canonical, Open Graph, sitemap
  and RSS presence, per-page uniqueness.
- **Bundle / requests:** font weights actually used vs. requested, number of
  network requests, anything shipped that the page doesn't need.

### Known finding (worked example)

The nav links row (`src/components/Nav.astro` `.links`) overflows the viewport by
~14px at ≤390px — a horizontal page scroll on phones. It's logged in
`docs/tasks/backlog.md` as an `[audit-finding]`. It's a **Tier 1** fix
(wrap / condense / scroll the nav on narrow screens — same links, same behavior),
and a good first thing to offer to apply.

## The report

Write a ranked list, most-impactful first. Each finding:

> **[Tier N] <dimension> — <one-line problem>** · measured: `<number>` ·
> pages: `<where>` · fix: `<what to change>` · effort: `<S/M/L>`

Keep Tier 1 and Tier 2 visually separate so the "safe to apply" set is obvious.

## Applying fixes

Only after the user approves. Apply **Tier 1** changes; leave **Tier 2** as
recommendations unless explicitly asked. After any change, **re-measure** the same
way and show the before/after number — a fix without a confirming measurement is a
guess. Then run the repo checks (`npm run posts-check`, `npm run tasks-check`,
`npm run features:check`) and a production build before considering it done.

## When to run an A/B test, and how to document the evidence

Not every change needs a test. Escalate from "just measure it once" to a real
A/B comparison when **the decision is contested, reversible, and the cost of being
wrong is more than trivial** — typically:

- Two viable implementations of the same thing (e.g. inline SVG vs. exported
  image; CSS animation vs. none; a font subset vs. the full family), and
- Someone could reasonably argue either way, and
- The choice is easy to encode as variants of one page.

If it's an obvious win (a missing `loading="lazy"`, an unused font weight), don't
ceremony it — apply the Tier 1 fix and note the before/after. Save A/B for genuine
forks.

**How to run one (the pattern to reuse):**

1. **Build variant pages that differ in exactly one thing.** Render the *same*
   content each way. Keep them out of production — either a **dev-only guarded
   page** (see `src/pages/bench/diagram.astro`, which 404s under
   `import.meta.env.PROD`) or a temp fixture. Never ship benchmark pages.
2. **Measure each variant identically**, on desktop and mobile, with the CDP
   harness. `scripts/diagram-bench.mjs` is the template — copy its structure for a
   new comparison rather than inventing one.
3. **Capture the numbers that decide it** — weight, paint, CLS, long-frames,
   whatever the fork turns on — plus the qualities a number can't show (does one
   variant lose selectable text? accessibility? crisp scaling?).

**How to document it (required — evidence that isn't written down didn't happen):**

- Write a regenerable results table to `docs/<thing>-bench.md` (model it on
  `docs/diagram-bench.md`), including **how to re-run it** and an **honest caveats**
  section — call out where a variant wins on one axis but loses on another, so the
  table never implies a false parity.
- Cite the finding where the decision lives: the relevant `docs/features/<id>.md`
  "why" doc gets an **Evidence** section, and if a blog post makes the claim, it
  cites the measured result in prose (see `earlbear-use-cases.mdx` for the shape).
- Add a `make <thing>-bench` / `npm run bench:<thing>` entry so the comparison is
  one command, and re-run it whenever the thing changes.

The rule of thumb: **decisions get evidence, evidence gets a doc, docs get a
re-run command.** A claim like "the SVG is lighter than an image" should always be
traceable to a table someone can regenerate.

## Notes

- This skill installs nothing. If a deeper audit ever needs Lighthouse as a
  library or a browser automation dep, that's a decision to raise with the user —
  it cuts against the repo's deliberate no-heavy-install stance (see CLAUDE.md).
- Pre-existing Astro-5 advisories surface in `npm audit` (dev-server / SSR XSS
  classes that don't apply to this prerendered static site). Note them; the fix is
  a major Astro upgrade, which is its own scoped decision — don't fold it into a
  routine audit.
- Clean up: kill the headless Chrome and any preview server you started.
