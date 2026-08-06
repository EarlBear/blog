#!/usr/bin/env node
/**
 * measure-layout.mjs — horizontal-overflow measurement that REFUSES to report
 * numbers from a page whose stylesheets did not load.
 *
 * WHY THIS EXISTS. On 2026-07-23 a mobile nav-overflow finding was closed as
 * "could not reproduce — 0px overflow at 320/360/375/390px" and the real fix was
 * downgraded to a belt-and-suspenders guard. The measurement was taken against a
 * local `file://` build. Astro links its stylesheet at an ABSOLUTE path:
 *
 *     <link rel="stylesheet" href="/_astro/_slug_.LxMPHa65.css">
 *
 * Under `file://` a leading `/` resolves to the FILESYSTEM ROOT, so that request
 * 404s and the page renders completely unstyled — and an unstyled page is a
 * single column of full-width block elements, which trivially cannot overflow.
 * Every number was 0 because nothing had a width to exceed. Re-measured over HTTP
 * against the same `dist/`: the homepage overflowed 83px @320px on main, and 291px
 * with a simulated sign-out cluster. The bug was always real; the tooling reported
 * a clean bill of health with total confidence and no warning of any kind.
 *
 * That is the failure this guards: **a layout measurement of an unstyled page is
 * not a measurement, it is a fabrication with the shape of one.** Nothing errors,
 * nothing is empty, nothing looks wrong — the run succeeds and answers 0.
 *
 * WHAT IS ACTUALLY CHECKED, and why it is not "reject file://". Refusing the
 * `file://` scheme alone would fix the one case we got burned by and miss the
 * class. The same zero comes from serving the wrong directory, a stale hashed
 * filename after a rebuild, a proxy that 200s an HTML error page for a .css, or a
 * CSP that blocks the sheet. So the scheme check is a fast, specific early exit
 * with a good message, and the REAL gate is applied to every page regardless of
 * how it was loaded: every same-origin `<link rel="stylesheet">` must have
 * produced a live sheet in `document.styleSheets` carrying rules. A stylesheet
 * that fails to load leaves its <link> in the DOM and contributes NO entry to
 * document.styleSheets, so the mismatch is exact and needs no allowlist.
 *
 * Cross-origin sheets (the Google Fonts link in BaseLayout) are counted but never
 * rule-inspected: reading .cssRules on them throws SecurityError by design, which
 * is not evidence of anything. Fonts also cannot cause the failure above — they
 * restyle text, they do not create the layout.
 *
 * Usage:
 *   make measure-layout                       # builds + serves + measures key pages
 *   node --experimental-websocket scripts/measure-layout.mjs http://localhost:4343/
 *   ... --paths /,/blog/life-without-earlbear/ --widths 320,375,480
 *
 * Exit codes: 0 measured (overflow findings are reported, not failed — this is a
 * measuring instrument, not a gate), 1 could not measure honestly, 2 bad usage.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME =
  process.env.CHROME_BIN ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = Number(process.env.CDP_PORT || 9334);

if (typeof WebSocket === 'undefined') {
  console.error(
    'This script needs a global WebSocket. Run with:\n' +
      '  node --experimental-websocket scripts/measure-layout.mjs <url>\n' +
      '  (or `make measure-layout`, which sets it for you)'
  );
  process.exit(2);
}

// ---- args ------------------------------------------------------------------
const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
// Single pass, so a positional that happens to repeat a flag's value (e.g. a path
// of "320") can't be mis-attributed by an indexOf that finds the wrong occurrence.
let base = null;
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) i++; // skip the flag AND its value
  else if (base === null) base = argv[i];
}
const BASE = base || process.env.PREVIEW_URL || 'http://localhost:4343';
const PATHS = flag('paths', '/').split(',').filter(Boolean);
const WIDTHS = flag('widths', '320,375,480').split(',').map(Number).filter(Boolean);

// ---- the scheme early-exit -------------------------------------------------
// Not the real gate (see the header) — just a faster, far clearer failure than
// letting it through to "0 of N stylesheets loaded", which reads like a bug in
// the site rather than a bug in how it was opened.
if (/^file:/i.test(BASE)) {
  console.error(
    `refusing to measure ${BASE}\n\n` +
      "  Astro links its stylesheet at an absolute path (/_astro/*.css). Under file://\n" +
      '  that resolves to the filesystem root, 404s, and the page renders UNSTYLED —\n' +
      '  where nothing has a width to exceed and every overflow measures 0px. This has\n' +
      '  already closed one real bug as "could not reproduce" (docs/tasks/done.md).\n\n' +
      '  Serve the build over HTTP instead:  make build && make preview\n' +
      '  then point this at http://localhost:4343.'
  );
  process.exit(1);
}

// ---- tiny CDP client (same shape as scripts/diagram-bench.mjs) --------------
function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m);
      pending.delete(m.id);
    }
  });
  return {
    ready: new Promise((r) => ws.addEventListener('open', r, { once: true })),
    send: (method, params = {}) =>
      new Promise((res) => {
        const i = ++id;
        pending.set(i, (m) => res(m.result));
        ws.send(JSON.stringify({ id: i, method, params }));
      }),
    close: () => ws.close(),
  };
}

async function findTarget(port) {
  for (let i = 0; i < 40; i++) {
    try {
      const targets = await (await fetch(`http://localhost:${port}/json`)).json();
      const page = targets.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
    await sleep(150);
  }
  throw new Error('Chrome DevTools endpoint never came up');
}

// ---- one page × one width --------------------------------------------------
/**
 * Returns { styled, links, sheets, missing[], overflow, offenders[] }.
 *
 * `styled` is computed IN THE PAGE and reported alongside the numbers rather than
 * being thrown away, so a caller that ignores the exit code still cannot read the
 * overflow without the evidence that it means something.
 */
async function measure(client, url, width) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await client.send('Page.navigate', { url });

  // Wait for LOAD + WEBFONTS, not a fixed sleep — and this is not a nicety.
  // Caught while building this: /blog/life-without-earlbear/ @375px measured 202px
  // of overflow inside a multi-page sweep and 40px when measured alone. Same build,
  // same width, same tool. The sweep had already loaded another page, so IBM Plex
  // was warm and the table laid out in it; measured first, the font was still in
  // flight and the table laid out in the fallback — narrower, so less overflow.
  // A fixed sleep makes that a coin flip decided by page ORDER, which is precisely
  // the failure this script exists to refuse: a plausible number that is wrong.
  // document.fonts.ready plus two frames makes it deterministic, and the timeout
  // caps a font that never arrives rather than hanging the sweep.
  await client.send('Runtime.evaluate', {
    expression: `new Promise((res) => {
      setTimeout(res, 5000);
      const settle = () => document.fonts.ready.then(
        () => requestAnimationFrame(() => requestAnimationFrame(res)));
      if (document.readyState === 'complete') settle();
      else addEventListener('load', settle, { once: true });
    })`,
    awaitPromise: true,
  });

  const { result } = await client.send('Runtime.evaluate', {
    expression: `(() => {
      const links = [...document.querySelectorAll('link[rel~="stylesheet"]')];
      const sameOrigin = links.filter(l => {
        try { return new URL(l.href, location.href).origin === location.origin; }
        catch { return false; }
      });
      // A stylesheet that failed to load keeps its <link> and contributes no
      // CSSStyleSheet, so comparing hrefs is exact — no allowlist, no heuristic.
      const loaded = new Set([...document.styleSheets]
        .filter(s => { try { return s.cssRules.length > 0; } catch { return true; } })
        .map(s => s.href).filter(Boolean));
      const missing = sameOrigin.map(l => l.href).filter(h => !loaded.has(h));

      const doc = document.documentElement;
      const overflow = Math.max(0, doc.scrollWidth - doc.clientWidth);

      // Every element wider than the viewport, DEDUPED BY SELECTOR and innermost
      // first. Deduping is what makes the list diagnostic rather than decorative:
      // a wide table produces one over-wide <tr> per row, and six identical "tr"
      // lines crowd out the one line that names the actual culprit
      // (table.raci-grid). Collapsed to "tr ×6" the table stays visible.
      const seen = new Map();
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width <= doc.clientWidth + 1) continue;
        const sel = el.tagName.toLowerCase() +
          (el.id ? '#' + el.id : '') +
          (el.className && typeof el.className === 'string'
            ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.')
            : '');
        let depth = 0; for (let n = el; (n = n.parentElement); ) depth++;
        const prev = seen.get(sel);
        if (prev) { prev.count++; prev.width = Math.max(prev.width, Math.round(r.width)); }
        else seen.set(sel, { sel, width: Math.round(r.width), depth, count: 1 });
      }
      // Deepest first (the leaf that actually has the width), but ALWAYS keep the
      // outermost over-wide element too. The fix almost always goes on a container
      // — an overflow-x wrapper around table.raci-grid — and pure deepest-first
      // slicing buries that container under the eight <tr>s it contains.
      const ranked = [...seen.values()].sort((a, b) => b.depth - a.depth);
      const offenders = ranked.slice(0, 5);
      const outermost = ranked[ranked.length - 1];
      if (outermost && !offenders.includes(outermost)) {
        offenders.push({ ...outermost, outermost: true });
      }

      return JSON.stringify({
        links: links.length, sameOrigin: sameOrigin.length,
        missing, styled: missing.length === 0 && sameOrigin.length > 0,
        overflow, viewport: doc.clientWidth, offenders,
      });
    })()`,
    returnByValue: true,
  });
  return JSON.parse(result.value);
}

// ---- main ------------------------------------------------------------------
async function main() {
  try {
    const probe = await fetch(BASE);
    if (!probe.ok) throw new Error(`HTTP ${probe.status}`);
  } catch (e) {
    console.error(
      `cannot reach ${BASE} (${e.message})\n` +
        '  Start the built site first:  make build && make preview'
    );
    process.exit(1);
  }

  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${mkdtempSync(tmpdir() + '/measure-layout-')}`,
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  let unstyled = 0;
  let findings = 0;
  try {
    const client = cdp(await findTarget(PORT));
    await client.ready;

    for (const path of PATHS) {
      const url = new URL(path, BASE).href;
      for (const width of WIDTHS) {
        const r = await measure(client, url, width);

        if (!r.styled) {
          unstyled++;
          console.log(
            `\n  ${path} @${width}px  NOT MEASURED — page is unstyled\n` +
              `      ${r.sameOrigin} same-origin stylesheet(s) linked, ` +
              `${r.sameOrigin - r.missing.length} loaded\n` +
              (r.missing.length
                ? `      missing: ${r.missing.join('\n               ')}\n`
                : '      no same-origin stylesheet is linked at all\n') +
              '      An unstyled page cannot overflow, so any number here would be a\n' +
              '      false all-clear. Fix the serve, then re-measure.'
          );
          continue;
        }

        const verdict = r.overflow > 0 ? `OVERFLOW ${r.overflow}px` : 'ok';
        if (r.overflow > 0) findings++;
        console.log(`\n  ${path} @${width}px (viewport ${r.viewport}px)  ${verdict}`);
        if (r.overflow > 0) {
          for (const o of r.offenders) {
            console.log(
              `      ${String(o.width).padStart(5)}px  ${o.sel}` +
                (o.count > 1 ? ` ×${o.count}` : '') +
                (o.outermost ? '   ← outermost; the wrapper fix usually goes here' : '')
            );
          }
        }
      }
    }
    client.close();
  } finally {
    chrome.kill();
  }

  console.log(
    `\n  ${PATHS.length * WIDTHS.length} measurement(s): ` +
      `${findings} with overflow, ${unstyled} refused as unstyled.`
  );
  // Unstyled pages are the one thing that fails the run: a partial sweep that
  // exits 0 is exactly the "everything is fine" signal that caused this.
  process.exit(unstyled > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
