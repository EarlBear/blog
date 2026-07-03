# EarlBear blog — common tasks
#
# Static Astro site, deployed to GitHub Pages from the gh-pages branch (no CI —
# org billing disabled). Design system is vendored (see CLAUDE.md). Run `make`
# with no args (or `make help`) to list targets.

.DEFAULT_GOAL := help

.PHONY: help install dev build preview deploy sync-assets regen-favicon \
        tasks-check features-check features-seed check clean

help: ## List available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
	  | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

## --- develop -------------------------------------------------------------

install: ## Install dependencies (all public — no token needed)
	npm install

dev: ## Run the local dev server (drafts visible) at localhost:4321
	npm run dev

build: ## Production build to dist/ (drafts excluded)
	npm run build

preview: ## Serve the built dist/ locally
	npm run preview

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

check: tasks-check features-check ## Run all governance checks

## --- ship ----------------------------------------------------------------

deploy: ## Build and push dist/ to the gh-pages branch (publishes the site)
	npm run deploy

## --- housekeeping --------------------------------------------------------

clean: ## Remove build output and Astro cache
	rm -rf dist .astro
