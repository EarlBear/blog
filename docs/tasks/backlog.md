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
