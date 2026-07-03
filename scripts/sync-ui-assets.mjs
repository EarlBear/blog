// Vendor the design-system tokens CSS and the SVG assets we use out of the
// EarlBear design-system repo into this repo.
//
// Why not consume @earlbear/ui from GitHub Packages? Package downloads are
// billing-gated and the org has hit its limit (same reason Actions are off), so
// `npm install` of the private package 403s. We vendor instead: copy the files
// from a local clone of the design system and record the exact source commit in
// .sync-source.json (the earlbear-landing pattern).
//
// Run on demand: `npm run sync-assets`. It is NOT wired into predev/prebuild so
// a normal build never depends on the design-system clone being present.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const configPath = resolve(root, '.sync-source.json');
const config = JSON.parse(readFileSync(configPath, 'utf8'));
const src = resolve(root, config.source_clone);

if (!existsSync(src)) {
  console.error(
    `[sync] design-system clone not found at ${src}\n` +
      `Set "source_clone" in .sync-source.json or clone EarlBear/design-system there.`
  );
  process.exit(1);
}

// tokens CSS → src/styles/tokens.css (imported by BaseLayout)
copyFileSync(
  resolve(src, 'colors_and_type.css'),
  resolve(root, 'src/styles/tokens.css')
);
console.log('[sync] colors_and_type.css -> src/styles/tokens.css');

// URL-referenced SVGs → public/vendor/ (footer sprite, about illustration)
const vendorDir = resolve(root, 'public/vendor');
mkdirSync(vendorDir, { recursive: true });
for (const f of ['icons.svg', 'earl-analyst.svg', 'earl-mark.svg']) {
  copyFileSync(resolve(src, 'assets', f), resolve(vendorDir, f));
  console.log(`[sync] assets/${f} -> public/vendor/${f}`);
}

// Record provenance.
let sha = 'unknown';
let date = '';
try {
  sha = execFileSync('git', ['-C', src, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  date = execFileSync('git', ['-C', src, 'show', '-s', '--format=%cI', 'HEAD'], {
    encoding: 'utf8',
  }).trim();
} catch {
  console.warn('[sync] could not read git sha from source clone; leaving as-is');
}
if (sha !== 'unknown') {
  config.last_synced_sha = sha;
  config.last_synced_short = sha.slice(0, 7);
  config.last_synced_commit_date = date;
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  console.log(`[sync] recorded source commit ${sha.slice(0, 7)}`);
}
