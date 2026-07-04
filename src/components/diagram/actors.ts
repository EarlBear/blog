/**
 * Actor glyphs for <UseCaseDiagram>.
 *
 * UML draws actors as stick figures outside the system boundary. We keep that
 * *placement* but swap the generic figure for on-brand marks:
 *   - internal → the Earl monogram (inlined so `currentColor` tinting works,
 *     same technique as src/components/EarlMark.astro)
 *   - external → a minimal line "person" (head + shoulders). The design system
 *     ships no customer icon, so we author one quiet, on-brand glyph here rather
 *     than importing a foreign icon set.
 *   - system   → a line gear, for automated/non-human actors (schedulers, jobs).
 *
 * Each glyph is returned as an SVG *fragment* (no outer <svg>) sized to a
 * `box`×`box` viewBox-local square, so the diagram can place it at any (x, y)
 * with a <g transform>. All strokes/fills use `currentColor` so the caller
 * controls the tint with a `color:` on the wrapping <g>.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type ActorKind = 'internal' | 'external' | 'system';

/** Read the Earl monogram and strip its hardcoded color + fixed size so the
 *  surrounding `color:` wins — mirrors EarlMark.astro. Cached at module load.
 *
 *  Resolve from the project root (`process.cwd()`), not relative to this module:
 *  this file bundles into dist/chunks/ at build time, so an `import.meta.url`-
 *  relative path would point at the chunk's location, not the source tree. Astro
 *  always builds from the repo root, so cwd is stable and correct. */
function loadEarlMarkInner(): string {
  const markPath = join(process.cwd(), 'public', 'vendor', 'earl-mark.svg');
  let svg = readFileSync(markPath, 'utf8');
  // Drop the color/size attributes; keep the viewBox so we can nest it.
  svg = svg
    .replace(/\scolor="[^"]*"/, '')
    .replace(/\swidth="[^"]*"/, '')
    .replace(/\sheight="[^"]*"/, '')
    .replace(/\saria-label="[^"]*"/, '');
  return svg; // still a full <svg …viewBox="0 0 120 120">…</svg>
}

const EARL_MARK_SVG = loadEarlMarkInner();

/**
 * Return an SVG fragment for the given actor kind, drawn to fit a `box`×`box`
 * square whose top-left is the local origin (0,0). The caller positions it.
 */
export function actorGlyph(kind: ActorKind, box: number): string {
  if (kind === 'internal') {
    // Nest the monogram's own <svg> scaled into the box. Nested <svg> with
    // width/height + its intrinsic viewBox scales cleanly and isolates coords.
    return EARL_MARK_SVG.replace(
      '<svg',
      `<svg x="0" y="0" width="${box}" height="${box}"`
    );
  }

  if (kind === 'system') {
    // A simple line gear: outer ring + eight teeth + hub. Stroke = currentColor.
    const c = box / 2;
    const r = box * 0.3;
    const teeth = Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4;
      const x1 = c + Math.cos(a) * r;
      const y1 = c + Math.sin(a) * r;
      const x2 = c + Math.cos(a) * (r + box * 0.1);
      const y2 = c + Math.sin(a) * (r + box * 0.1);
      return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" />`;
    }).join('');
    return (
      `<g fill="none" stroke="currentColor" stroke-width="${(box * 0.05).toFixed(2)}" stroke-linecap="round">` +
      `<circle cx="${c}" cy="${c}" r="${r.toFixed(2)}" />` +
      teeth +
      `<circle cx="${c}" cy="${c}" r="${(box * 0.1).toFixed(2)}" />` +
      `</g>`
    );
  }

  // external → line person: head circle + shoulders arc.
  const c = box / 2;
  const headR = box * 0.16;
  const headCy = box * 0.3;
  const sw = (box * 0.06).toFixed(2);
  return (
    `<g fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round">` +
    `<circle cx="${c}" cy="${headCy.toFixed(2)}" r="${headR.toFixed(2)}" />` +
    `<path d="M ${(box * 0.2).toFixed(2)} ${(box * 0.82).toFixed(2)} ` +
    `Q ${c} ${(box * 0.48).toFixed(2)}, ${(box * 0.8).toFixed(2)} ${(box * 0.82).toFixed(2)}" />` +
    `</g>`
  );
}
