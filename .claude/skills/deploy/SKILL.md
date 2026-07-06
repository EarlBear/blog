---
name: deploy
description: Deploy the EarlBear blog. It has TWO targets — the public EXTERNAL site (blog.earlbear.com, GitHub Pages) and the org-gated INTERNAL site (blog.internal.earlbear.com, Cloudflare Pages). Use when the user says "deploy", "publish the blog", "push to production", "ship it", "put it live", or asks to debug a failed deploy. ALWAYS asks (via AskUserQuestion) whether to deploy external, internal, or both, runs the right build+guard+deploy for each, verifies the result, and has a recovery path. Never deploys without explicit confirmation.
---

# Deploy the blog

The blog builds **two audiences from one repo** (see `docs/features/audience-split.md`),
so there are two deploy targets:

- **External** → `https://blog.earlbear.com` (GitHub Pages, `gh-pages` branch).
  `npm run deploy` builds with `PUBLIC_AUDIENCE=external`, runs the audience guard,
  and force-pushes `dist/` to `gh-pages`.
- **Internal** → `https://blog.internal.earlbear.com` (Cloudflare Pages, gated by
  Cloudflare Access). `npm run deploy:internal` builds with
  `PUBLIC_AUDIENCE=internal`, runs the guard, strips the external CNAME, and
  `wrangler pages deploy`s to the `earlbear-blog-internal` project (auth via a
  dotenvx-encrypted `CLOUDFLARE_API_TOKEN`).

`main` stays source-only. The **external site shows only published external posts**;
the **internal site shows all internal posts including drafts** (the org-private
working ground).

## Step 0 — ask which target(s) to deploy

**Always start by asking, with AskUserQuestion:** external, internal, or both?
The two sites publish independently and to different audiences, so never assume —
a reader who says "deploy" may mean one, the other, or both. Then run the matching
path(s) below. If they want **both**, do external first (lower risk), verify it,
then internal.

```
AskUserQuestion: "Which site(s) should I deploy?"
  - External only (blog.earlbear.com — public)
  - Internal only (blog.internal.earlbear.com — org-gated)
  - Both
```

## Guardrails

- **Confirm the target(s) AND confirm before pushing.** Deploying external
  publishes *public* content — state exactly what will ship and get an explicit yes.
- Deploy from a clean, committed `main` — don't ship uncommitted changes silently.
- **The audience guard is mandatory, not optional.** Every deploy path runs
  `check-audience.py` against the built `dist/` before publishing; an internal post
  in an external build (or vice versa) aborts the deploy. Do not skip it.

## Internal deploy (Cloudflare Pages)

For the **internal** target:

```bash
npm run deploy:internal
```

This asserts the target, builds internal, runs the leak gate
(`--check-dist dist --audience internal`), strips `dist/CNAME`, then
`dotenvx run -- wrangler pages deploy dist --project-name earlbear-blog-internal`.

Prerequisites (check before the first internal deploy):
- **The dotenvx key** — `make key-status` should show `.env.keys present` and the
  LastPass backup; if a fresh clone, `make key-restore` (needs `lpass login`).
  `CLOUDFLARE_API_TOKEN` in `.env` must be `encrypted:…`, not empty.
- **The Cloudflare Pages project** — `earlbear-blog-internal` with
  `blog.internal.earlbear.com` attached, plus the CF Access app. Verify with
  `dotenvx run -- wrangler pages project list`. One-time provisioning is codified in
  the sibling `earlbear-domain` repo (tracked in `docs/tasks/backlog.md`).

Verify after: the deployment lists under `wrangler pages deployment list`, and the
site is reachable but **gated** — `blog.internal.earlbear.com` should return a
Cloudflare Access login, not the content, when off-org.

## External deploy (GitHub Pages)

For the **external** target, work through the pre-flight then deploy.

### Pre-flight

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

### Deploy

4. **Confirm, then push:**

   ```bash
   npm run deploy
   ```

   This asserts the external target, builds with `PUBLIC_AUDIENCE=external`, runs
   the audience guard, then `gh-pages -d dist --dotfiles --nojekyll`. The
   `--dotfiles` flag carries `.nojekyll`; `CNAME` rides along from `public/`.

### Watch the deployment to completion (don't stop at "pushed")

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

### When the external (GitHub Pages) deploy fails

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

## Post-deployment validation (do this after EVERY deploy — never stop at "pushed")

"Deployed" is not "correct and live." After each target, validate:

**External (`blog.earlbear.com`):**

```bash
curl -sL -o /dev/null -w "home: %{http_code}\n" https://blog.earlbear.com/
# a post that IS external → 200:
curl -sL -o /dev/null -w "%{http_code}\n" https://blog.earlbear.com/blog/<external-slug>/
# SECURITY: a post that is INTERNAL → must be 404 (never public):
curl -sL -o /dev/null -w "%{http_code}\n" https://blog.earlbear.com/blog/<internal-slug>/
```
Home + external post = 200; **every internal post = 404**. A 200 on an internal
post is a disclosure — treat as an incident.

**Internal (`blog.internal.earlbear.com`):**

```bash
# The deployment is listed:
dotenvx run -- wrangler pages deployment list --project-name earlbear-blog-internal
# GATED: the domain must redirect to the CF Access login, NOT serve content off-org:
curl -sL -o /dev/null -w "%{http_code} → %{url_effective}\n" https://blog.internal.earlbear.com/
```
The URL must resolve to `earlbear.cloudflareaccess.com/cdn-cgi/access/login/…`
(a 302 → login), **not** the blog content. If it serves content off-org, the CF
Access app isn't gating it — stop and fix the Access policy before treating it as
private.

**Both:** the deploy's own `check-audience.py --check-dist` gate already proved the
built artifact had no cross-audience content; the live checks above confirm the
*serving* matches. Record the outcome: mark the deploy task done with the shipped
commit, and note both live URLs verified.

## Notes

- Rollback = redeploy from an earlier `main` commit (checkout, then the matching
  `npm run deploy` / `deploy:internal`).
- The external custom domain rides on `public/CNAME`; the internal deploy strips it
  (`rm -f dist/CNAME`) so the internal artifact can't claim `blog.earlbear.com`.
- **Deploy-script env order:** the `assert-target` guard reads `PUBLIC_AUDIENCE`, so
  the deploy scripts set it at the *front* of the command (not only inside the build
  sub-step) — otherwise the guard sees it unset and blocks. Keep that prefix.
