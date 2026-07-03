---
name: deploy
description: Deploy the EarlBear blog to GitHub Pages. Use when the user says "deploy", "publish the blog", "push to production", "ship it", or "put it live". Runs pre-flight checks, builds, pushes the built site to the gh-pages branch, and verifies the live site. Never pushes without explicit confirmation.
---

# Deploy the blog

The blog deploys to GitHub Pages **from the `gh-pages` branch** (no GitHub
Actions — org billing is disabled). `npm run deploy` builds and force-pushes
`dist/` to `gh-pages`; GitHub's free built-in branch build serves it at
`https://blog.earlbear.com`. `main` stays source-only.

## Guardrails

- **Confirm before pushing.** Deploying publishes public content. State what will
  ship and ask for an explicit yes (AskUserQuestion) before `npm run deploy`.
- Deploy from a clean, committed `main` — don't ship uncommitted local changes
  silently.

## Pre-flight

1. **Working tree state.** `git status --short`. If there are uncommitted source
   changes, surface them and ask whether to commit first (deploy ships the build
   of whatever is on disk, committed or not).

2. **Task + feature-doc invariants:**

   ```bash
   npm run tasks-check        # done.md only closed, backlog.md only open
   npm run features:check     # auto-heal moves; exit 1 on unreviewed drift
   ```

   If `features:check` reports drift, reconcile with the `feature-docs` skill
   before shipping — don't deploy on top of a stale rationale.

3. **Build + preview.**

   ```bash
   npm run build && npm run preview
   ```

   Confirm `dist/` contains `CNAME`, `.nojekyll`, `rss.xml`, `sitemap-index.xml`,
   `404.html`, `favicon.svg`, and `vendor/`. Spot-check the preview.

## Deploy

4. **Confirm, then push:**

   ```bash
   npm run deploy
   ```

   This runs `astro build` then `gh-pages -d dist --dotfiles --nojekyll`. The
   `--dotfiles` flag is what carries `.nojekyll`; `CNAME` rides along from
   `public/`.

## Verify live (give Pages a minute to rebuild)

5. Check the deployed branch and live site:

   ```bash
   git ls-remote --heads origin gh-pages          # branch exists
   curl -sI https://blog.earlbear.com | head -1   # 200
   curl -s  https://blog.earlbear.com/rss.xml -o /dev/null -w '%{http_code}\n'
   ```

   For a first-ever deploy, DNS + Pages settings must be done once (tracked in
   `docs/tasks/backlog.md`): Cloudflare CNAME `blog → earlbear.github.io`
   (DNS-only), repo Settings → Pages → Deploy from branch `gh-pages`, custom
   domain + Enforce HTTPS. Until those exist, verify at the `*.github.io` URL.

6. Record the deploy: if a "Deploy" task was open, mark it done; note the shipped
   commit.

## Notes

- Rollback = redeploy from an earlier `main` commit (checkout, `npm run deploy`).
- The custom domain is preserved across deploys because `public/CNAME` is copied
  into every build — don't remove it.
