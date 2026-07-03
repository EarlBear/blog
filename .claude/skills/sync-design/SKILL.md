---
name: sync-design
description: Re-pull the vendored EarlBear design tokens and SVG assets from the design-system repo into this blog. Use when the user says "sync the design system", "update the tokens", "pull latest design", "refresh the assets", or when the design system has changed and the blog should pick it up. Shows what changed before copying; never auto-pushes.
---

# Sync design system

The blog **vendors** the design system rather than consuming the `@earlbear/ui`
npm package (GitHub Packages downloads are billing-gated / over quota — see
CLAUDE.md and `.sync-source.json`). This skill re-pulls the tokens CSS and SVG
assets from a local clone of the design system and records the source commit.

Vendored files (see `.sync-source.json` for the authoritative list):
- `colors_and_type.css` → `src/styles/tokens.css`
- `assets/{icons.svg, earl-analyst.svg, earl-mark.svg}` → `public/vendor/`

## Guardrails

- **Show what changed before copying.** The user should see the delta.
- **Never auto-push.** Commit locally if asked, then stop and ask before any
  push (use AskUserQuestion).
- Only the files in `.sync-source.json` are copied — this is a scoped mirror,
  not a whole-repo sync.

## Workflow

1. **Locate the clone** (`source_clone` in `.sync-source.json`, default
   `../earlbear-design-system`). If it's missing, tell the user and stop — there
   is no registry fallback while packages are billing-blocked.

   ```bash
   SRC=$(python3 -c "import json;print(json.load(open('.sync-source.json'))['source_clone'])")
   git -C "$SRC" status --short          # warn if the clone is dirty
   git -C "$SRC" fetch origin && git -C "$SRC" pull --ff-only
   ```

2. **Show the delta** since the last sync:

   ```bash
   LAST=$(python3 -c "import json;print(json.load(open('.sync-source.json'))['last_synced_sha'])")
   NEW=$(git -C "$SRC" rev-parse HEAD)
   git -C "$SRC" log --oneline "$LAST..$NEW" -- colors_and_type.css assets
   git -C "$SRC" diff --stat "$LAST..$NEW" -- colors_and_type.css assets
   ```

   If `LAST == NEW`, tell the user it's already up to date and stop.

3. **Copy + record.** Run the sync script (it copies the files and rewrites the
   sha/date in `.sync-source.json`):

   ```bash
   npm run sync-assets
   ```

4. **Regenerate the favicon** if `earl-mark.svg` changed (the favicon is derived
   from it):

   ```bash
   npm run regen-favicon
   ```

5. **Verify.** `npm run build` succeeds; spot-check the site in `npm run dev`
   (tokens still resolve, mark/illustration render). If tokens were removed or
   renamed upstream, the build or visual check will surface it — fix references
   in `src/` before committing.

6. **Commit — then ask before pushing.**

   ```bash
   git add src/styles/tokens.css public/vendor public/favicon.svg .sync-source.json
   git commit -m "Sync design system from design-system@<short-sha>

   <one-line summary of what changed>

   Synced-from: design-system@<full-sha>"
   ```

   Then STOP and ask the user whether to push.

## Notes

- If a design-system token the blog relies on is renamed/removed, the safe fix is
  in this repo (update the reference), not editing vendored `tokens.css` by hand —
  the next sync would clobber a manual edit.
- When GitHub Packages billing is restored, revisit migrating to the npm package
  (tracked in `docs/tasks/backlog.md`); this skill becomes obsolete then.
