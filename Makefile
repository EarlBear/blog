# EarlBear blog — common tasks
#
# Static Astro site with two audiences: the EXTERNAL site (blog.earlbear.com,
# GitHub Pages / gh-pages branch, public) and the INTERNAL site
# (blog.internal.earlbear.com, Cloudflare Pages, CF Access-gated). One repo, two
# builds selected by PUBLIC_AUDIENCE — see CLAUDE.md. No CI (org billing disabled).
# Design system is vendored. Run `make` with no args (or `make help`) for targets.

.DEFAULT_GOAL := help

.PHONY: help install install-hooks scan collect-secret encrypt decrypt key-backup key-restore key-status signing-key-status secrets-check dev dev-internal build build-internal preview deploy deploy-internal audience-check sync-assets \
        regen-favicon tasks-check features-check features-seed posts-check diagrams-check visuals-check catalog-check expects-check repo-map-check anchor-ids-check check \
        bench-diagram reconcile-comments clean

help: ## List available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
	  | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

## --- secrets -------------------------------------------------------------

install-hooks: ## Wire git hooks (secret scan + concurrent-change capture) — run once after clone
	@git config core.hooksPath .githooks
	@command -v gitleaks >/dev/null 2>&1 || echo "  warn: gitleaks not installed — brew install gitleaks"
	@sh scripts/setup-concurrency.sh
	@echo "  core.hooksPath -> .githooks (secret scan + concurrent-capture active)"

scan: ## Full gitleaks secret scan of the working tree + history
	gitleaks detect --source . --verbose

# The internal deploy (`make deploy-internal`) auths wrangler with a scoped
# CLOUDFLARE_API_TOKEN (Account:Cloudflare Pages:Edit), stored dotenvx-ENCRYPTED in
# .env and injected via `dotenvx run --` — the auth model the earlbear-domain
# deploy-contract audit requires (not machine wrangler OAuth). The dotenvx PRIVATE
# key (.env.keys) is gitignored and lives only on this machine, so LastPass is its
# source-of-truth backup. Requires the lpass CLI + an active session (`lpass login
# <email>`).
#
# Set/rotate the token with the same codified flow as earlbear-domain:
#   make collect-secret VARS=CLOUDFLARE_API_TOKEN   # seeds a placeholder in .env, opens it
#   # paste the value, then:
#   make encrypt        # plaintext → dotenvx ciphertext (safe to commit)
#   make key-backup     # back the private key up to LastPass
collect-secret: ## Seed placeholder(s) for VARS=<name...> in .env (gitignored), open to paste, then `make encrypt`
	@test -n "$(VARS)" || { echo "Usage: make collect-secret VARS=\"CLOUDFLARE_API_TOKEN\""; exit 2; }
	@scripts/collect-secret.sh $(VARS)

encrypt: ## Encrypt .env in place (after pasting a secret — plaintext → dotenvx ciphertext)
	./node_modules/.bin/dotenvx encrypt
	@# Nudge: a new/changed secret means .env.keys may have changed (a first-ever encrypt
	@# creates it). LastPass is its only backup — lose it and every `encrypted:` value is
	@# unrecoverable. Advisory only (never blocks). Skip with EB_NO_BACKUP_NUDGE=1.
	@[ "$${EB_NO_BACKUP_NUDGE:-}" = "1" ] || sh scripts/key-backup-nudge.sh

decrypt: ## Decrypt .env locally (rarely needed; requires .env.keys)
	./node_modules/.bin/dotenvx decrypt
	@echo "  reminder: .env now holds PLAINTEXT — do NOT commit; run 'make encrypt' when done."

key-backup: ## Back up .env.keys (dotenvx private key) to LastPass (source of truth)
	@npm run --silent key-backup

key-restore: ## Restore .env.keys from LastPass (on a fresh clone / new machine)
	@npm run --silent key-restore

key-status: ## Show whether .env.keys is backed up in LastPass + present locally
	@npm run --silent key-status

signing-key-status: ## Report the local ES256 signing key (dev token-mint): present? shared symlink? gitignored?
	@sh scripts/signing-key-status.sh

## --- develop -------------------------------------------------------------

install: ## Install dependencies (all public — no token needed)
	npm install

# Ensure node_modules is present + in sync with the lockfile before any build/deploy,
# so a fresh checkout deploy doesn't fail on a missing local wrangler/dotenvx. Runs
# `npm ci` only when package-lock.json is newer than node_modules (cheap no-op otherwise).
# The earlbear-domain deploy-contract audit requires build/deploy to have this prerequisite.
node_modules: package-lock.json
	npm ci
	@touch node_modules

dev: ## Run the local dev server for the EXTERNAL/public site (drafts visible) at localhost:4343
	@# Plain `astro dev` = the PUBLIC audience: no comment layer, no Supabase, no CF-Access-gated
	@# content — a preview of exactly what ships to blog.earlbear.com. This is intentional; for the
	@# INTERNAL site with the comment layer, use `make dev-internal`. Bare `astro dev` needs NO
	@# secrets (the external build reads none), so it does not go through dotenvx.
	npm run dev

# The blessed way to run the INTERNAL site locally (comment layer, Supabase-backed). TWO things
# the plain `astro dev` gets wrong and silently degrade with NO error until you hit the comment
# layer (learned the hard way — see docs/run-locally.md / the run-blog-locally skill):
#   1. PUBLIC_AUDIENCE=internal — else Astro compiles the internal audience OUT: the comment layer
#      is tree-shaken, `data-audience=external`, and pressing C does nothing (looks like a bug).
#   2. dotenvx run -- — else Astro reads .env as raw text and inlines the dotenvx CIPHERTEXT
#      (`PUBLIC_SUPABASE_URL="encrypted:…"`) verbatim → supabase-js throws
#      "Invalid supabaseUrl" at createClient and the layer never initializes. dotenvx DECRYPTS
#      .env first (needs .env.keys), so the real https:// URL + publishable key reach the build.
# Local token minting is handled by the DEV-ONLY dev-auth-token integration (identity defaults to
# dev@earlbear.com / EB_DEV_LOGIN_EMAIL), which needs the local signing key — see
# `make signing-key-status`. No key → the layer loads but reads nothing (the secure empty default).
dev-internal: ## Run the local dev server for the INTERNAL site WITH the comment layer (dotenvx-decrypted, PUBLIC_AUDIENCE=internal) at localhost:4343
	PUBLIC_AUDIENCE=internal ./node_modules/.bin/dotenvx run --quiet -- npx astro dev --port 4343

build: node_modules ## Production build to dist/ (external site: drafts + internal posts excluded)
	npm run build:external

build-internal: node_modules ## Production build to dist/ for the internal site (external posts excluded)
	npm run build:internal

preview: ## Serve the built dist/ locally
	npm run preview

audience-check: ## Verify the built dist/ contains no cross-audience content (fail-closed)
	npm run audience-check

## --- design system (vendored) --------------------------------------------

sync-assets: ## Re-pull tokens CSS + SVG assets from ../earlbear-design-system
	npm run sync-assets

regen-favicon: ## Rebuild public/favicon.svg from the Earl mark, tinted --color-accent
	npm run regen-favicon

## --- governance ----------------------------------------------------------

tasks-check: ## Verify docs/tasks/ invariant (done=closed, backlog=open)
	npm run tasks-check

features-check: ## Check docs/features/ why-docs for drift (auto-heals moves)
	npm run features:check

features-seed: ## Seed hashes for any uncached feature anchors
	npm run features:seed

posts-check: ## Validate blog-post frontmatter + voice rules
	npm run posts-check

diagrams-check: ## Verify every component used in an .mdx post is imported
	npm run diagrams-check

visuals-check: ## Nudge: flag wall-of-text sections with no visual (advisory)
	npm run visuals-check

catalog-check: ## Nudge: flag diagram components/shapes missing from the catalog (advisory)
	npm run catalog-check

expects-check: ## Nudge: flag a post whose frontmatter `expects` a visual it lacks (advisory)
	npm run expects-check

repo-map-check: ## Check the internal Repo Map (src/repo-map/artifact.html) data against the live earlbear-* ecosystem (drift → exit 1)
	@node .claude/skills/manage-repo-map/scripts/scan-repos.mjs

secrets-check: ## Fail if any tracked .env* holds a plaintext value (structural dotenvx guard)
	@python3 .claude/hooks/check-env-encrypted.py --check

anchor-ids-check: build-internal ## Fail if any commentable diagram element (node/edge/row) in the built dist/ lacks its stable anchor id
	@python3 .claude/hooks/check-anchor-ids.py --check dist

check: tasks-check features-check posts-check diagrams-check visuals-check catalog-check expects-check secrets-check anchor-ids-check ## Run all governance checks

## --- measure --------------------------------------------------------------

bench-diagram: ## A/B + perf harness for the use-case diagram → docs/diagram-bench.md
	npm run bench:diagram

## --- comments -------------------------------------------------------------

# Range-anchored comments store their passage as text + context + a content-hash (Axis B4). When
# a post is EDITED, that hash drifts. reconcile-comments re-locates each range passage in the
# freshly-built post and emits the UPDATEs to re-anchor them — or FAILS LOUD (exit 1, full debug)
# on a passage that's genuinely gone. Run it on-demand after editing a post that has comments;
# it is NOT wired into build/deploy (keeps those fast + offline). See docs/comments-design.md B4.
#
# The DB read (fetch this post's range comments) + write-back (apply the UPDATEs) are done by the
# operator via the Supabase MCP / a service-role wrapper — this target runs the pure reconcile
# ENGINE over the built HTML + a comments JSON, so no service key touches this Makefile. Usage:
#   make build-internal                                   # produce dist/blog/<slug>/index.html
#   # fetch range comments for the post as JSON → comments.json (MCP select), then:
#   make reconcile-comments SLUG=<slug> COMMENTS=comments.json
#   # apply the printed `updates` as UPDATEs (MCP); orphans (exit 1) are reconciled by hand.
reconcile-comments: ## Re-anchor a post's range comments after an edit (fail-loud on a gone passage). SLUG=<slug> COMMENTS=<file.json>
	@test -n "$(SLUG)" || { echo "Usage: make reconcile-comments SLUG=<post-slug> COMMENTS=<file.json> [ALLOW_ORPHANS=1]"; exit 2; }
	@test -n "$(COMMENTS)" || { echo "Usage: make reconcile-comments SLUG=<post-slug> COMMENTS=<file.json> [ALLOW_ORPHANS=1]"; exit 2; }
	node scripts/reconcile-comments.mjs --slug "$(SLUG)" --comments "$(COMMENTS)" \
	  $(if $(POST_COMMIT),--post-commit "$(POST_COMMIT)",) $(if $(ALLOW_ORPHANS),--allow-orphans,)

## --- ship ----------------------------------------------------------------

deploy: node_modules ## Build + guard + push dist/ to gh-pages — publishes the EXTERNAL site (blog.earlbear.com)
	npm run deploy

# The scoped Account:Pages:Edit token can't read /memberships, so wrangler must NOT resolve the
# account itself — pass CLOUDFLARE_ACCOUNT_ID explicitly. Non-secret; owned by earlbear-domain
# (the single source for sibling repos). Mirrors earlbear-gtm-workflow's Makefile.
CF_ACCOUNT_ID ?= $(shell make -C ../earlbear-domain -s account-id 2>/dev/null)

deploy-internal: node_modules ## Build + guard + deploy to Cloudflare Pages — publishes the INTERNAL site (blog.internal.earlbear.com)
	@# Two fixes so `make deploy-internal` works standalone (was requiring both to be exported by hand):
	@#  1. PUBLIC_AUDIENCE=internal — the deploy:internal script's `check-audience --assert-target internal`
	@#     runs BEFORE build:internal sets it inline, so it must be in the env up front.
	@#  2. CLOUDFLARE_ACCOUNT_ID — see the note above (scoped token can't read /memberships).
	@test -n "$(CF_ACCOUNT_ID)" || (echo "FAIL: no CLOUDFLARE_ACCOUNT_ID (is ../earlbear-domain present?)" && exit 1)
	PUBLIC_AUDIENCE=internal CLOUDFLARE_ACCOUNT_ID=$(CF_ACCOUNT_ID) npm run deploy:internal

## --- housekeeping --------------------------------------------------------

clean: ## Remove build output and Astro cache
	rm -rf dist .astro
