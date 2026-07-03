# Backlog

Open tasks. Format: `- [ ] <task>`. When closed, move to [done.md](./done.md) as `- [x] … @done(<isoTimestamp>) #git:<first8ofcommitId>`.
Tasks must exist here (or in done.md) **before** being deleted from the live task list — see [CLAUDE.md](../../CLAUDE.md).

- [ ] [MANUAL] Cloudflare DNS: add CNAME `blog` → `earlbear.github.io`, DNS only (grey cloud)
- [ ] [MANUAL] Repo Settings → Pages: Source = Deploy from a branch → `gh-pages` / `(root)`
- [ ] [MANUAL] Repo Settings → Pages: set custom domain `blog.earlbear.com`, then enable Enforce HTTPS once the cert issues
- [ ] [MANUAL] Org Settings → Pages → verified domains: verify `earlbear.com` (prevents subdomain takeover)
- [ ] When GitHub Packages billing is restored: consider migrating from vendored `src/styles/tokens.css` back to consuming `@earlbear/ui` as an npm dependency (also publish the design system's `./tokens` + `./assets/*` exports first). Until then, vendoring via `npm run sync-assets` is the supported path.
- [ ] Footer social links: replace placeholder `#` hrefs with real profile URLs (github/x, optionally bluesky/discord)
- [ ] Add apple-touch-icon.png (180px) generated from earlbear-icon.svg for iOS home-screen bookmarks
