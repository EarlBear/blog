# EarlBear blog — common tasks
#
# Static Astro site with two audiences: the EXTERNAL site (blog.earlbear.com,
# GitHub Pages / gh-pages branch, public) and the INTERNAL site
# (blog.internal.earlbear.com, Cloudflare Pages, CF Access-gated). One repo, two
# builds selected by PUBLIC_AUDIENCE — see CLAUDE.md. No CI (org billing disabled).
# Design system is vendored. Run `make` with no args (or `make help`) for targets.

.DEFAULT_GOAL := help

.PHONY: help install install-hooks scan key-backup key-restore key-status dev build build-internal preview deploy deploy-internal audience-check sync-assets \
        regen-favicon tasks-check features-check features-seed posts-check diagrams-check visuals-check catalog-check expects-check check \
        bench-diagram clean

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
# <email>`). Set the token once with `npx dotenvx set CLOUDFLARE_API_TOKEN <token>`.
key-backup: ## Back up .env.keys (dotenvx private key) to LastPass (source of truth)
	@npm run --silent key-backup

key-restore: ## Restore .env.keys from LastPass (on a fresh clone / new machine)
	@npm run --silent key-restore

key-status: ## Show whether .env.keys is backed up in LastPass + present locally
	@npm run --silent key-status

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

dev: ## Run the local dev server (drafts visible) at localhost:4343
	npm run dev

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

check: tasks-check features-check posts-check diagrams-check visuals-check catalog-check expects-check ## Run all governance checks

## --- measure --------------------------------------------------------------

bench-diagram: ## A/B + perf harness for the use-case diagram → docs/diagram-bench.md
	npm run bench:diagram

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
