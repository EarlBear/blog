# Backlog

Open tasks. Format: `- [ ] <task>`. When closed, move to [done.md](./done.md) as `- [x] … @done(<isoTimestamp>) #git:<first8ofcommitId>`.
Tasks must exist here (or in done.md) **before** being deleted from the live task list — see [CLAUDE.md](../../CLAUDE.md).

- [ ] [audit-finding] `/blog/life-without-earlbear/` overflows horizontally on phones — **live on the public site now**: 257px @320px, 202px @375px, 97px @480px. Cause is an unconstrained `table.raci-grid` (453px wide) in `src/content/blog/life-without-earlbear.md`; an `overflow-x: auto` wrapper covers it. Measured over HTTP against a real `dist/` build (not `file://` — see the correction on the nav-overflow entry in done.md for why that distinction burned us once already), identically before and after the #21 nav fix, so it is independent of it and a bigger mobile problem than the nav ever was. A separate site-wide ~40px comes from `div.container` rendering 407px in a 375px viewport — unexplained, worth its own look. **Reproduce with `make measure-layout`** (added 2026-08-06), which re-derives all three numbers exactly and refuses to report anything from an unstyled page.
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

## Diagram system — deferred ideas

Candidates that surfaced while building the diagram catalog (`enrich-post` /
`new-diagram-kind` skills). None is urgent; each is a real, scoped follow-up.

- [ ] Legend/key for `UseCaseDiagram` actor kinds (internal/external/system) — FlowDiagram has `legend`; UseCaseDiagram relies on the visible actor labels, but a small key could help. Only if a diagram proves confusing.
- [ ] Publish (un-draft) the enriched posts — all 8 agentic/architecture posts are `draft: true`, so the diagrams aren't live yet. Decide which to ship, verify each renders in a production build, then flip `draft: false`.
- [ ] Extend the Mermaid subset parser: subgraphs, `class`/`style` directives, and sequence-diagram syntax (currently flowchart-only — see `.claude/skills/enrich-post/catalog.md`).
- [ ] Consider a `matrix`/`grid` FlowDiagram-style shape or a Timeline primitive if a post needs one (per the `new-diagram-kind` skill — survey the catalog first).
- [ ] Broaden the visual-density heuristic if it proves noisy or misses cases (per-paragraph vs per-section; tune the 280-word threshold with real usage).

## Deferred infra

- [ ] Astro/dependency security advisories: `npm audit` reports pre-existing Astro-5 XSS/SSR classes (don't apply to this prerendered static site; fixing means an Astro 7 major upgrade). Revisit as a scoped upgrade, not a routine fix. Surfaced by the `frontend-audit` skill.

## Blog on-ramp follow-ups (from the reader-review audit — docs/blog-arc-audit.md)

- [ ] Fix the PUBLIC self-healing-storefront.mdx on-ramp: name EarlBear as the operator (currently anonymous "us"/"we") and resolve the dangling "the scanner" reference (self-contain in one sentence or a public CTA — do NOT link the internal scanner posts). External post → must pass external-post-review / secret-sauce-check + the audience gate.
- [ ] Delete (or keep) the internal-only-example.md fixture now the audience split is verified. NOTE: the new start-here post links it as the audience-split example — repoint or drop that link first, then remove the file + re-run posts-check and both builds.
