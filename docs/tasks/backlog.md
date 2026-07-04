# Backlog

Open tasks. Format: `- [ ] <task>`. When closed, move to [done.md](./done.md) as `- [x] … @done(<isoTimestamp>) #git:<first8ofcommitId>`.
Tasks must exist here (or in done.md) **before** being deleted from the live task list — see [CLAUDE.md](../../CLAUDE.md).

- [ ] [MANUAL] Repo Settings → Pages: Source = Deploy from a branch → `gh-pages` / `(root)`
- [ ] [MANUAL] Repo Settings → Pages: set custom domain `blog.earlbear.com`, then enable Enforce HTTPS once the cert issues
- [ ] [MANUAL] Org Settings → Pages → verified domains: verify `earlbear.com` (prevents subdomain takeover)
- [ ] First deploy: run `npm run deploy` to create the `gh-pages` branch (needs the Pages settings above)
- [ ] Seed docs/features/ why-docs for the shipped v1 features (rss-feed, tags, authors, syntax-highlighting, vendored-design-system) with real HEAD-pinned anchors, then `npm run features:seed`
- [ ] When GitHub Packages billing is restored: consider migrating from vendored `src/styles/tokens.css` back to consuming `@earlbear/ui` as an npm dependency (also publish the design system's `./tokens` + `./assets/*` exports first)
- [ ] Footer + author social links: replace placeholder `#` hrefs with real profile URLs (github/x, optionally bluesky/discord)
- [ ] Add apple-touch-icon.png (180px) generated from earl-mark.svg for iOS home-screen bookmarks
- [ ] Real author portraits to replace the shared Earl-mark avatar on author cards/pages
- [ ] Revisit React (or other framework) integration in Astro via islands (`@astrojs/react`) — only if a post needs genuine client-side interactivity. Astro is HTML-first and ships zero JS by default; framework components are opt-in islands that pull in a renderer runtime, so weigh that cost against the blog's zero-JS baseline. Prefer plain `.astro` components or build-time SVG (see `UseCaseDiagram`) unless interactivity is required.
- [ ] When GitHub Packages billing is restored: consider upstreaming the diagram actor glyphs (`src/components/diagram/actors.ts` — the external "customer" and "system" line marks the design system currently lacks) into `@earlbear/ui` as framework-agnostic SVG primitives, then consume them here via the vendored-assets sync.
- [ ] Track B: build a `/frontend-audit` skill (local + advisory) — build+preview, drive Chrome via CDP for Lighthouse + perf trace on desktop and mobile, produce a ranked perf/a11y/SEO/bundle report; Tier 1 = functional-equivalent fixes (apply on approval), Tier 2 = behavior-shifting (recommend only).
- [ ] Track C: build a diagram perf + A/B harness (`scripts/diagram-bench.mjs`) — variant pages (animated / static / image-baseline) measured via CDP on desktop + mobile for HTML weight, paint, CLS, and animation frame cost; emit `docs/diagram-bench.md`.
- [ ] [audit-finding] Nav links row (`src/components/Nav.astro` `.links`) overflows the viewport by ~14px at ≤390px width (horizontal page scroll on phones). Found while verifying diagram mobile-safety; fix belongs to the frontend-audit skill as a Tier-1 functional-equivalent change (wrap/scroll/condense the nav on narrow screens).
