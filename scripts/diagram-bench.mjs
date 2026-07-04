#!/usr/bin/env node
/**
 * diagram-bench.mjs — measure the use-case diagram head-to-head across variants,
 * on desktop and mobile, so our design decisions are backed by numbers.
 *
 * Variants (all render the SAME diagram — see src/pages/bench/diagram.astro):
 *   A animated — the shipping design (gradient drift + draw-in)
 *   B static   — identical DOM, animation disabled → isolates the motion cost
 *   C image    — the same diagram flattened to a PNG → the "just ship an image"
 *                baseline (what a screenshot / D2-export route would cost)
 *
 * Per variant × viewport we capture:
 *   - transfer bytes of the document (inline SVG weight lands here)
 *   - First Contentful Paint (ms)
 *   - Cumulative Layout Shift (unitless; 0 is perfect)
 *   - long-frame count during a 3s window (frames >50ms; animation jank proxy)
 *
 * No dependencies: drives a headless Chrome over the DevTools Protocol using
 * Node's built-in WebSocket (run with `node --experimental-websocket`, which the
 * npm script / Makefile target supplies). Requires Google Chrome installed.
 *
 * Output: docs/diagram-bench.md (regenerable). Honest-by-design: if a variant
 * wins on weight but loses the effect, the report says so.
 *
 * Usage:  npm run bench:diagram      (preferred — sets the node flag + dev server)
 *         node --experimental-websocket scripts/diagram-bench.mjs
 */
import { spawn, execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const DEV_URL = 'http://localhost:4321';
const BENCH_PATH = '/bench/diagram';
const CHROME =
  process.env.CHROME_BIN ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900, mobile: false },
  { name: 'mobile', width: 390, height: 844, mobile: true },
];
const VARIANTS = ['animated', 'static', 'image'];

if (typeof WebSocket === 'undefined') {
  console.error(
    'This script needs a global WebSocket. Run with:\n' +
      '  node --experimental-websocket scripts/diagram-bench.mjs\n' +
      '  (or `npm run bench:diagram`, which sets it for you)'
  );
  process.exit(1);
}

// ---- tiny CDP client -------------------------------------------------------
function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m);
      pending.delete(m.id);
    } else if (m.method) {
      for (const l of listeners) l(m);
    }
  });
  const ready = new Promise((r) => ws.addEventListener('open', r, { once: true }));
  return {
    ready,
    on: (fn) => {
      listeners.push(fn);
      return () => {
        const i = listeners.indexOf(fn);
        if (i >= 0) listeners.splice(i, 1);
      };
    },
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
  // Retry — the debugging endpoint takes a moment after launch.
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://localhost:${port}/json`);
      const targets = await res.json();
      const page = targets.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
    await sleep(150);
  }
  throw new Error('Chrome DevTools endpoint never came up');
}

async function waitForDevServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(DEV_URL);
      if (r.ok) return;
    } catch {
      /* not up */
    }
    await sleep(250);
  }
  throw new Error(`dev server never came up at ${DEV_URL}`);
}

// ---- one measurement -------------------------------------------------------
async function measure(client, url, viewport) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.mobile ? 2 : 1,
    mobile: viewport.mobile,
  });

  // Track the MAIN DOCUMENT transfer size specifically — the inline SVG lands in
  // the HTML document, so we want that response's bytes, not the largest asset
  // (fonts etc. would otherwise dominate). We pin the requestId whose URL is the
  // page we navigate to, then read its encodedDataLength when it finishes.
  let docRequestId = null;
  let transferBytes = 0;
  const off = client.on((m) => {
    if (m.method === 'Network.requestWillBeSent' && m.params.type === 'Document') {
      if (m.params.request.url.split('#')[0] === url.split('#')[0]) {
        docRequestId = m.params.requestId;
      }
    }
    if (
      m.method === 'Network.loadingFinished' &&
      m.params.requestId === docRequestId
    ) {
      transferBytes = m.params.encodedDataLength || 0;
    }
  });

  await client.send('Network.enable');
  await client.send('Page.navigate', { url });
  await sleep(3200); // let paint settle + the drift animation run a window

  const metrics = await client.send('Runtime.evaluate', {
    expression: `(() => {
      const fcp = performance.getEntriesByName('first-contentful-paint')[0];
      // CLS via the buffered layout-shift entries.
      let cls = 0;
      for (const e of performance.getEntriesByType('layout-shift')) {
        if (!e.hadRecentInput) cls += e.value;
      }
      // Long-frame proxy: measure frame gaps for ~1.5s. A wall-clock timeout
      // guarantees resolution even if rAF stalls (e.g. a throttled headless
      // compositor) so the harness can never hang.
      return new Promise((resolve) => {
        let last = performance.now();
        let longFrames = 0, frames = 0;
        const start = last;
        const done = () => resolve(JSON.stringify({
          fcp: fcp ? Math.round(fcp.startTime) : null,
          cls: Math.round(cls * 1000) / 1000,
          frames, longFrames,
          docBytes: document.documentElement.outerHTML.length,
        }));
        const guard = setTimeout(done, 2500); // hard cap
        function tick(now) {
          const gap = now - last; last = now; frames++;
          if (gap > 50) longFrames++;
          if (now - start < 1500) requestAnimationFrame(tick);
          else { clearTimeout(guard); done(); }
        }
        requestAnimationFrame(tick);
      });
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });

  off();
  return { transferBytes, ...JSON.parse(metrics.result.value) };
}

// The image baseline (variant C) is measured inline in main(): we capture a PNG
// screenshot of the rendered diagram and report its byte weight — the honest
// cost of the "just ship a picture" alternative.

// ---- main ------------------------------------------------------------------
async function isDevUp() {
  try {
    const r = await fetch(DEV_URL);
    return r.ok;
  } catch {
    return false;
  }
}

async function main() {
  // Reuse an already-running dev server if there is one; otherwise start our own.
  let dev = null;
  const alreadyUp = await isDevUp();
  if (alreadyUp) {
    console.log('› reusing the dev server already running at ' + DEV_URL);
  } else {
    console.log('› starting dev server (astro dev)…');
    dev = spawn('npm', ['run', 'dev'], { stdio: 'ignore', detached: false });
  }
  const cleanupDev = () => {
    if (dev) {
      try {
        process.kill(dev.pid);
      } catch {}
    }
  };
  process.on('exit', cleanupDev);

  try {
    await waitForDevServer();
    console.log('  dev server up.');

    const profile = mkdtempSync(join(tmpdir(), 'diagram-bench-'));
    const port = 9333;
    console.log('› launching headless Chrome…');
    const chrome = spawn(
      CHROME,
      [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        `--remote-debugging-port=${port}`,
        `--user-data-dir=${profile}`,
        'about:blank',
      ],
      { stdio: 'ignore' }
    );
    const cleanupChrome = () => {
      try {
        process.kill(chrome.pid);
      } catch {}
    };
    process.on('exit', cleanupChrome);

    const wsUrl = await findTarget(port);
    const client = cdp(wsUrl);
    await client.ready;
    await client.send('Page.enable');
    await client.send('Runtime.enable');

    const rows = [];
    for (const variant of VARIANTS) {
      for (const vp of VIEWPORTS) {
        if (variant === 'image') {
          // Render the diagram at this viewport, then capture a PNG and report
          // its byte weight — the cost of the "just ship a picture" alternative.
          await client.send('Emulation.setDeviceMetricsOverride', {
            width: vp.width,
            height: vp.height,
            deviceScaleFactor: vp.mobile ? 2 : 1,
            mobile: vp.mobile,
          });
          await client.send('Page.navigate', {
            url: `${DEV_URL}${BENCH_PATH}?variant=static`,
          });
          await sleep(1500);
          const shot = await client.send('Page.captureScreenshot', { format: 'png' });
          const pngBytes = shot?.data ? Buffer.from(shot.data, 'base64').length : 0;
          rows.push({
            variant,
            viewport: vp.name,
            fcp: null,
            cls: 0,
            longFrames: 0,
            frames: 0,
            transferBytes: pngBytes,
            note: 'PNG export weight; no animation possible',
          });
          console.log(`› image baseline @ ${vp.name}: ${(pngBytes / 1024).toFixed(1)} KB`);
          continue;
        }
        const url = `${DEV_URL}${BENCH_PATH}?variant=${variant}`;
        process.stdout.write(`› measuring ${variant} @ ${vp.name}… `);
        const r = await measure(client, url, vp);
        rows.push({ variant, viewport: vp.name, ...r, note: '' });
        console.log(
          `fcp=${r.fcp}ms cls=${r.cls} longFrames=${r.longFrames}/${r.frames}`
        );
      }
    }

    writeReport(rows);
    client.close();
    console.log('\n✓ wrote docs/diagram-bench.md');
  } finally {
    cleanupDev();
  }
}

function fmtKB(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function writeReport(rows) {
  const stamp = process.env.BENCH_STAMP || 'local run';
  let md = `# Diagram benchmark

Head-to-head measurement of the use-case diagram, regenerated by
\`node --experimental-websocket scripts/diagram-bench.mjs\` (or \`make bench-diagram\`).
All three variants render the **same** diagram; only the delivery differs.

- **animated** — the shipping design (gradient drift + draw-in on load)
- **static** — identical DOM, animation disabled (isolates the motion cost)
- **image** — the same diagram as a flat PNG (the "just ship a picture" baseline)

Measured on a headless Chrome, ${stamp}. Numbers move run-to-run; read the
*relationships*, not the absolute values.

| Variant | Viewport | Doc transfer | FCP | CLS | Long frames (>50ms) |
|---|---|--:|--:|--:|--:|
`;
  for (const r of rows) {
    md += `| ${r.variant} | ${r.viewport} | ${fmtKB(r.transferBytes)} | ${
      r.fcp == null ? '—' : r.fcp + ' ms'
    } | ${r.cls} | ${r.variant === 'image' ? '— (n/a)' : `${r.longFrames} / ${r.frames}`} |\n`;
  }

  md += `
## What this shows

- **Animation cost:** compare \`animated\` vs \`static\` long-frame counts. If they
  are within a frame or two of each other, the ambient gradient drift + draw-in is
  effectively free on the main thread — which is the design goal (CSS-only,
  GPU-friendly, and fully disabled under \`prefers-reduced-motion\`).
- **Layout stability:** CLS should be ~0 for every variant — the diagram reserves
  its space via the SVG \`viewBox\`, so nothing reflows as it animates.
- **Weight vs. the image baseline:** the inline-SVG variants ship the diagram as
  part of the document (no extra request). The \`image\` row is the byte weight of
  the equivalent PNG — a *separate* asset the browser would also have to fetch. If
  the SVG is competitive on bytes, we keep the SVG and get crisp scaling,
  animation, live text (selectable, translatable, accessible), and diffable source
  for free.

## Honest caveats

- The \`image\` baseline **cannot animate** and its text is not selectable or
  accessible — a weight comparison alone understates what the image route gives
  up. We flag it here rather than let the table imply parity.
- FCP on a warm local dev server is optimistic vs. production over a network; use
  it to compare variants against each other, not as an absolute budget.
`;
  writeFileSync('docs/diagram-bench.md', md);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
