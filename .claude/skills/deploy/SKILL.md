---
name: deploy
description: Deploy the EarlBear blog to GitHub Pages. Use when the user says "deploy", "publish the blog", "push to production", "ship it", "put it live", or asks to debug a failed Pages deploy. Runs pre-flight checks, builds, pushes the built site to the gh-pages branch, then watches the Pages deployment run to completion (via gh CLI) and verifies the new content is actually live — with a recovery path when the deploy fails. Never pushes without explicit confirmation.
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

## Watch the deployment to completion (don't stop at "pushed")

Pushing to `gh-pages` is not the same as publishing. Even with Actions billing
off, GitHub auto-runs a `pages-build-deployment` workflow on every `gh-pages`
push; **its deploy step can fail server-side** ("Deployment failed, try again
later") while the branch push succeeds — leaving the *previous* build live. A
plain `curl https://blog.earlbear.com` returns **200 for the stale build**, so
site-is-up is NOT proof the deploy landed. Watch the run and verify the **new
content**.

5. **Watch the Pages deployment run finish** (via `gh` CLI):

   ```bash
   # The auto-run for the gh-pages push — watch it to completion.
   gh run list --repo EarlBear/blog --workflow pages-build-deployment \
     --branch gh-pages --limit 1 --json databaseId,status,conclusion
   gh run watch <databaseId> --repo EarlBear/blog     # blocks until done
   # Legacy branch-build status (the free path this repo uses):
   gh api repos/EarlBear/blog/pages/builds/latest \
     --jq '{status, error: .error.message, commit: .commit[0:8]}'
   ```

   A healthy branch build goes `building → built` in ~20s. Stuck at `building`
   with `duration: 0`, or a `pages-build-deployment` run whose `deploy` job is
   `failure`, means the deploy did not land — go to "When the deploy fails."

6. **Verify the NEW content is live** — not just that the site responds. Check a
   path or string that only exists in this deploy, and follow redirects:

   ```bash
   # Use --resolve if the local DNS cache is stale (public DNS is source of truth).
   curl -sL -o /dev/null -w '%{http_code}\n' \
     --resolve blog.earlbear.com:443:185.199.108.153 \
     https://blog.earlbear.com/blog/<new-slug>/          # want 200, not 404
   curl -s --resolve blog.earlbear.com:443:185.199.108.153 \
     https://blog.earlbear.com/blog/<new-slug>/ | grep -o '<a-string-new-this-deploy>'
   ```

   A 404 on the new page while the homepage is 200 is the signature of a failed
   deploy serving the prior build.

   For a first-ever deploy, DNS + Pages settings must be done once (tracked in
   `docs/tasks/backlog.md`): Cloudflare CNAME `blog → earlbear.github.io`
   (DNS-only), repo Settings → Pages → Deploy from branch `gh-pages`, custom
   domain + Enforce HTTPS. Until those exist, verify at the `*.github.io` URL.

7. Record the deploy: if a "Deploy" task was open, mark it done; note the shipped
   commit.

## When the deploy fails

The `gh-pages` branch already has the new build (verify with
`git ls-tree -r origin/gh-pages --name-only | grep <slug>`); only the *publish*
failed. In order:

1. **Confirm it's the deploy, not the build.** `gh run view <id> --log-failed`.
   If the `build` job passed and only `deploy` failed with "try again later,"
   it's a transient/server-side (or org-billing) failure — our content is fine.
2. **Re-run it.** `gh run rerun <databaseId> --repo EarlBear/blog`, then watch
   again (step 5). This clears most transient failures.
3. **Or re-push.** `npm run deploy` again force-pushes `dist/` and retriggers the
   build. (`npm run deploy` *is* the local build-and-deploy path — `astro build`
   then `gh-pages -d dist`; there is no separate CI to wait on.)
4. **If it keeps failing,** it's the org-level Actions/Pages billing gate (the
   same limit that disabled Actions). That is a manual fix in org billing
   settings — surface it to the user; re-pushing won't help until it's resolved.
5. Runs can sit `queued` for minutes when runner/Pages capacity is constrained —
   that is not a failure. Only a `completed/failure` conclusion is.

## Notes

- Rollback = redeploy from an earlier `main` commit (checkout, `npm run deploy`).
- The custom domain is preserved across deploys because `public/CNAME` is copied
  into every build — don't remove it.
