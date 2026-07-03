// Regenerate public/favicon.svg from the EarlBear mark, tinted with the brand
// accent. Source of truth is the design system's earl-mark.svg (the glasses
// mark) — we take the vendored copy at public/vendor/earl-mark.svg (falling back
// to the design-system clone) and hardwire `color` to the accent, since a
// favicon has no CSS parent to inherit `currentColor` from.
//
// Run: `npm run regen-favicon` (or `make regen-favicon`).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// --color-accent from the design tokens.
const ACCENT = '#B14726';

const candidates = [
  resolve(root, 'public/vendor/earl-mark.svg'),
  resolve(root, '../earlbear-design-system/assets/earl-mark.svg'),
];
const src = candidates.find(existsSync);
if (!src) {
  console.error(
    '[gen-favicon] earl-mark.svg not found. Run `npm run sync-assets` first, ' +
      'or ensure ../earlbear-design-system is checked out.'
  );
  process.exit(1);
}

let svg = readFileSync(src, 'utf8').trim();

// Force the tint: replace an existing color="..." on the root <svg>, or inject
// one if absent. The mark's internal fills use currentColor, so this colors the
// whole glyph while leaving the baked cream muzzle/lenses intact.
if (/<svg[^>]*\scolor="/.test(svg)) {
  svg = svg.replace(/(<svg[^>]*\scolor=")[^"]*(")/, `$1${ACCENT}$2`);
} else {
  svg = svg.replace(/<svg\b/, `<svg color="${ACCENT}"`);
}

const out = resolve(root, 'public/favicon.svg');
writeFileSync(out, svg + '\n', 'utf8');
console.log(`[gen-favicon] wrote public/favicon.svg from ${src.replace(root + '/', '')} (tint ${ACCENT})`);
