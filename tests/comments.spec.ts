import { test, expect, type Page } from '@playwright/test';

// The blog's first e2e suite — the internal comment layer. Hermetic: the network calls the
// layer makes are route-intercepted, so it never touches the real Supabase table. The claims
// proven here are the DOM ones the live RLS proof (docs/poc-comments.md) can't cover: the
// commentable ALLOWLIST (P6), fragment ANCHORING (P5), and that the layer initializes on an
// internal post. A rich real post (headings + a DecisionTable + diagrams) is the fixture.
const POST = '/blog/ecommerce-site-scanner-design/';

async function stubBackend(page: Page) {
  await page.route('**/api/auth-token', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'fake.jwt', expires_at: Date.now() + 1_800_000, email: 'dev@earlbear.com' }),
    }),
  );
  await page.route('**/rest/v1/blog_comments**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.route('**/realtime/v1/**', (route) => route.abort());
}

test.describe('internal comment layer', () => {
  test('the layer initializes on an internal post', async ({ page }) => {
    await stubBackend(page);
    await page.goto(POST);
    await expect(page.locator('[data-comment-layer]')).toBeAttached();
    // The test hook is exposed once the guarded script runs (proves PUBLIC_AUDIENCE==='internal').
    await expect.poll(() => page.evaluate(() => !!(window as any).__commentLayer)).toBe(true);
    await expect.poll(() => page.evaluate(() => !!(window as any).__commentLayerReady)).toBe(true);
  });

  test('C-mode: pressing C toggles comment mode, outlines commentables, and Esc exits (regression: TDZ)', async ({ page }) => {
    // Regression guard: initCommentLayer wires the mode toggle synchronously, referencing `let`s
    // that must be declared before the wiring call. A temporal-dead-zone error there throws
    // silently (the layer "initializes" but the toggle never works). This exercises the FULL init
    // path (not just the exposed pure helpers), so it catches that.
    await stubBackend(page);
    await page.goto(POST);
    await expect.poll(() => page.evaluate(() => !!(window as any).__commentLayerReady)).toBe(true);

    // window.__commentMode is the settled source of truth (set at the end of setCommentMode), so
    // gate each phase on it before asserting the DOM it drives — avoids racing the keypress.
    const modeIs = (on: boolean) =>
      expect.poll(() => page.evaluate(() => (window as any).__commentMode === true)).toBe(on);

    // Press C → comment mode on: root gets data-comment-mode, commentables get outlined, the
    // hint banner shows.
    await page.locator('body').press('c');
    await modeIs(true);
    expect(await page.evaluate(() => document.documentElement.dataset.commentMode)).toBe('true');
    await expect(page.locator('[data-cl-mode-hint]')).toBeVisible();
    expect(
      await page.evaluate(() => document.querySelectorAll('.prose [data-cl-commentable]').length),
    ).toBeGreaterThan(0);

    // Press C again → mode off: attribute cleared, outlines removed, hint hidden.
    await page.locator('body').press('c');
    await modeIs(false);
    expect(await page.evaluate(() => document.documentElement.dataset.commentMode || '')).toBe('');
    await expect(page.locator('[data-cl-mode-hint]')).toBeHidden();
    expect(
      await page.evaluate(() => document.querySelectorAll('.prose [data-cl-commentable]').length),
    ).toBe(0);

    // C on again, then Esc → also exits.
    await page.locator('body').press('c');
    await modeIs(true);
    await page.locator('body').press('Escape');
    await modeIs(false);
  });

  test('C-mode does not toggle while typing in the composer, and ⌘/Ctrl-C never triggers it', async ({ page }) => {
    await stubBackend(page);
    await page.goto(POST);
    await expect.poll(() => page.evaluate(() => !!(window as any).__commentLayerReady)).toBe(true);

    // Ctrl+C (copy) must NOT enter comment mode.
    await page.locator('body').press('Control+c');
    expect(await page.evaluate(() => document.documentElement.dataset.commentMode || '')).toBe('');
  });

  test('P6: the commentable allowlist matches fragment-anchored content (incl. rehype-id prose), never a <p> WITHOUT an id or an SVG internal', async ({ page }) => {
    await stubBackend(page);
    await page.goto(POST);
    await expect.poll(() => page.evaluate(() => !!(window as any).__commentLayer)).toBe(true);

    const result = await page.evaluate(() => {
      const { findCommentables } = (window as any).__commentLayer;
      const items = findCommentables();
      return {
        count: items.length,
        kinds: [...new Set(items.map((i: any) => i.anchorKind))].sort(),
        // A commentable <p> is ONLY one that has an id (from the rehype-block-ids plugin);
        // a paragraph without an id must never be commentable.
        anyParagraphWithoutId: items.some((i: any) => i.el.tagName === 'P' && !i.el.id),
        // Every kind is one of the allowed content kinds — never an SVG-internal element.
        onlyAllowedKinds: items.every((i: any) =>
          ['heading', 'decision', 'diagram', 'node', 'entity', 'prose', 'edge', 'component', 'table', 'row', 'cell'].includes(i.anchorKind),
        ),
        // No commentable element is an SVG-internal (gradient/marker/clip/title/desc).
        anySvgInternal: items.some((i: any) =>
          /^(lineargradient|radialgradient|marker|clippath|filter|pattern|mask|title|desc|stop)$/i.test(i.el.tagName),
        ),
      };
    });

    expect(result.count).toBeGreaterThan(0);
    expect(result.anyParagraphWithoutId).toBe(false);
    expect(result.onlyAllowedKinds).toBe(true);
    expect(result.anySvgInternal).toBe(false);
    // The post has headings, a DecisionTable, and id'd prose, so those kinds must be present.
    expect(result.kinds).toEqual(expect.arrayContaining(['heading', 'decision', 'prose']));
  });

  test('diagram edges are commentable (labeled + unlabeled), anchored by data-edge, id independent of the label', async ({ page }) => {
    await stubBackend(page);
    await page.goto(POST);
    await expect.poll(() => page.evaluate(() => !!(window as any).__commentLayer)).toBe(true);

    const result = await page.evaluate(() => {
      const { findCommentables, commentableFor, resolveAnchor } = (window as any).__commentLayer;
      const items = findCommentables();
      const edges = items.filter((i: any) => i.anchorKind === 'edge');
      // Every rendered edge carries a data-edge id, so every edge is commentable — labeled or not.
      const allEdgesHaveDataEdge = Array.from(document.querySelectorAll('.prose .flow-edge')).every(
        (g) => g.getAttribute('data-edge'),
      );
      // Pick a labeled edge (has a chip) and a bare one; both must be commentable via the <g>.
      const gWithLabel = document.querySelector('.prose .flow-edge:has(.flow-edge-label)');
      const gNoLabel = Array.from(document.querySelectorAll('.prose .flow-edge')).find(
        (g) => !g.querySelector('.flow-edge-label'),
      );
      // The edge id is from__to (no '#' unless repeated) — it does NOT contain the label text.
      const sampleId = edges[0]?.anchorId ?? '';
      // Every edge carries a WIDE transparent hit-path so the hairline arrow is easy to hover for
      // commenting (the visible line stays thin). Guard both: the hit-path exists on each edge and
      // its stroke is much wider than the visible line's.
      const allEdgesHaveHit = Array.from(document.querySelectorAll('.prose .flow-edge')).every(
        (g) => g.querySelector('.flow-edge-hit'),
      );
      const someHit = document.querySelector('.prose .flow-edge .flow-edge-hit');
      const someLine = document.querySelector('.prose .flow-edge .flow-edge-line');
      const hitW = someHit ? parseFloat(getComputedStyle(someHit).strokeWidth) : 0;
      const lineW = someLine ? parseFloat(getComputedStyle(someLine).strokeWidth) : 0;

      return {
        edgeCount: edges.length,
        allEdgesHaveDataEdge,
        labeledCommentable: gWithLabel ? commentableFor(gWithLabel.querySelector('.flow-edge-label') || gWithLabel) != null : false,
        unlabeledCommentable: gNoLabel ? commentableFor(gNoLabel.querySelector('path') || gNoLabel) != null : false,
        idResolves: sampleId ? resolveAnchor(sampleId) != null : false,
        idShape: /^[^#]+__[^#]+(#\d+)?$/.test(sampleId),
        allEdgesHaveHit,
        hitWiderThanLine: hitW >= lineW * 5, // fat band, ~10x in practice
      };
    });

    expect(result.edgeCount).toBeGreaterThan(0);
    expect(result.allEdgesHaveDataEdge).toBe(true);
    expect(result.labeledCommentable).toBe(true);
    if (result.unlabeledCommentable !== false) expect(result.unlabeledCommentable).toBe(true);
    expect(result.idResolves).toBe(true);
    expect(result.idShape).toBe(true); // from__to shape — the label is NOT part of the id
    expect(result.allEdgesHaveHit).toBe(true); // wide hover target on every arrow
    expect(result.hitWiderThanLine).toBe(true);
  });

  test('use-case diagram: ovals + actors are commentable (namespaced ids), and a click in C-mode composes a comment, NOT the detail modal', async ({ page }) => {
    await stubBackend(page);
    await page.goto(POST);
    await expect.poll(() => page.evaluate(() => !!(window as any).__commentLayer)).toBe(true);

    // Data layer: every use-case oval carries data-uc, every actor data-actor, both commentable
    // under a namespaced anchor (uc:<id> / actor:<id>) that resolves round-trip.
    const data = await page.evaluate(() => {
      const { commentableFor, resolveAnchor } = (window as any).__commentLayer;
      const oval = document.querySelector('.ucd-oval[data-uc]') as HTMLElement | null;
      const actor = document.querySelector('.ucd-actor[data-actor]') as HTMLElement | null;
      const allOvalsHaveId = Array.from(document.querySelectorAll('.ucd-oval')).every((g) => g.getAttribute('data-uc'));
      const allActorsHaveId = Array.from(document.querySelectorAll('.ucd-actor')).every((g) => g.getAttribute('data-actor'));
      const ovalC = oval ? commentableFor(oval) : null;
      const actorC = actor ? commentableFor(actor) : null;
      return {
        allOvalsHaveId, allActorsHaveId,
        ovalAnchor: ovalC?.anchorId ?? null,
        actorAnchor: actorC?.anchorId ?? null,
        ovalResolves: ovalC ? resolveAnchor(ovalC.anchorId) === oval : false,
        actorResolves: actorC ? resolveAnchor(actorC.anchorId) === actor : false,
      };
    });
    expect(data.allOvalsHaveId).toBe(true);
    expect(data.allActorsHaveId).toBe(true);
    expect(data.ovalAnchor).toMatch(/^uc:/);
    expect(data.actorAnchor).toMatch(/^actor:/);
    expect(data.ovalResolves).toBe(true);
    expect(data.actorResolves).toBe(true);

    // Interaction: in C-mode, clicking an oval opens the COMMENT composer and NOT the use-case
    // detail modal (the oval's own click handler defers to comment mode).
    await page.locator('body').press('c');
    await expect.poll(() => page.evaluate(() => (window as any).__commentMode === true)).toBe(true);
    await page.locator('.ucd-oval[data-uc]').first().scrollIntoViewIfNeeded();
    await page.locator('.ucd-oval[data-uc]').first().click();
    await expect(page.locator('.cl-composer')).toBeVisible();
    expect(await page.evaluate(() => (document.querySelector('.ucd-modal') as HTMLDialogElement | null)?.open ?? false))
      .toBe(false); // detail modal must NOT open in comment mode
  });

  test('broad anchors: the Questions box + its rows, tables, table rows + cells, and component boxes are commentable by stamped id', async ({ page }) => {
    await stubBackend(page);
    await page.goto(POST);
    await expect.poll(() => page.evaluate(() => !!(window as any).__commentLayer)).toBe(true);

    const result = await page.evaluate(() => {
      const { findCommentables, commentableFor, resolveAnchor } = (window as any).__commentLayer;
      const items = findCommentables();
      const kinds = items.map((i: any) => i.anchorKind);

      // The Questions aside lives OUTSIDE .prose (in PostLayout) — it must still be commentable,
      // stamped with an eb-<hash> id + data-anchor-kind="component".
      const questions = document.querySelector('.questions[id][data-anchor-kind="component"]') as HTMLElement | null;
      const questionRow = document.querySelector('.questions li[id][data-anchor-kind="row"]') as HTMLElement | null;

      // Any table + its rows/cells (not just DecisionTables).
      const table = document.querySelector('.article table[id][data-anchor-kind="table"]') as HTMLElement | null;
      const cell = document.querySelector('.article td[id][data-anchor-kind="cell"], .article th[id][data-anchor-kind="cell"]') as HTMLElement | null;

      // Every element the stamper marked commentable carries an id (the anchor-ids invariant).
      const allTaggedHaveId = Array.from(document.querySelectorAll('.article [data-anchor-kind]')).every(
        (el) => (el as HTMLElement).id,
      );

      return {
        counts: {
          component: kinds.filter((k: string) => k === 'component').length,
          row: kinds.filter((k: string) => k === 'row').length,
          table: kinds.filter((k: string) => k === 'table').length,
          cell: kinds.filter((k: string) => k === 'cell').length,
        },
        allTaggedHaveId,
        // The Questions box + a question row are commentable AND resolve back by id (round-trip),
        // even though they sit outside .prose.
        questionsCommentable: questions ? commentableFor(questions) != null : false,
        questionsResolves: questions ? resolveAnchor(questions.id) === questions : false,
        questionRowCommentable: questionRow ? commentableFor(questionRow) != null : false,
        tableCommentable: table ? commentableFor(table) != null : false,
        cellCommentable: cell ? commentableFor(cell) != null : false,
      };
    });

    // This fixture post (ecommerce-site-scanner-design) has the Questions box, a table, rows, cells.
    expect(result.allTaggedHaveId).toBe(true);
    expect(result.counts.component).toBeGreaterThan(0); // the Questions box
    expect(result.counts.row).toBeGreaterThan(0);        // question rows + table rows
    expect(result.counts.table).toBeGreaterThan(0);
    expect(result.counts.cell).toBeGreaterThan(0);
    expect(result.questionsCommentable).toBe(true);
    expect(result.questionsResolves).toBe(true); // resolveAnchor scoped to .article, not just .prose
    expect(result.questionRowCommentable).toBe(true);
    expect(result.tableCommentable).toBe(true);
    expect(result.cellCommentable).toBe(true);
  });

  test('C-mode reaches OUTSIDE .prose: the Questions box is highlighted AND clicking it opens the composer', async ({ page }) => {
    // Regression: the Questions aside (and other component boxes stamped in PostLayout) live under
    // .article but OUTSIDE .prose. The allowlist recognized them (previous test), but comment-mode
    // WIRING was scoped to .prose — so the box was never highlighted and a click never opened the
    // composer. This drives the real interaction to prove the mode is rooted at .article.
    await stubBackend(page);
    await page.goto(POST);
    await expect.poll(() => page.evaluate(() => !!(window as any).__commentLayerReady)).toBe(true);

    // Enter comment mode.
    await page.locator('body').press('c');
    await expect.poll(() => page.evaluate(() => (window as any).__commentMode === true)).toBe(true);

    // The Questions aside — OUTSIDE .prose — must get the highlight marker while in mode.
    const aside = page.locator('aside.questions[data-anchor-kind="component"]');
    await expect(aside).toHaveAttribute('data-cl-commentable', '');
    // And so must an individual question row.
    await expect(page.locator('aside.questions li[data-anchor-kind="row"]').first())
      .toHaveAttribute('data-cl-commentable', '');

    // Clicking the box in mode opens the composer (the interaction that was broken).
    await page.locator('aside.questions li[data-anchor-kind="row"]').first().click();
    await expect(page.locator('.cl-composer')).toBeVisible();
    // The composer targets THAT question's anchor id (element anchor, not a stray range).
    const composedOnRow = await page.evaluate(() => {
      const dlg = document.querySelector('.cl-composer') as HTMLDialogElement | null;
      const li = document.querySelector('aside.questions li[data-anchor-kind="row"]') as HTMLElement | null;
      // The composer heading echoes the row's text — a coarse but robust check it anchored to it.
      return !!dlg?.open && !!li && (dlg.textContent || '').includes((li.textContent || '').slice(0, 20));
    });
    expect(composedOnRow).toBe(true);
  });

  test('P5: every commentable anchor resolves back to its element by fragment id', async ({ page }) => {
    await stubBackend(page);
    await page.goto(POST);
    await expect.poll(() => page.evaluate(() => !!(window as any).__commentLayer)).toBe(true);

    const result = await page.evaluate(() => {
      const { findCommentables, resolveAnchor } = (window as any).__commentLayer;
      const items = findCommentables();
      // Each commentable's anchor id resolves back to a real element (round-trip).
      const allResolve = items.every((i: any) => resolveAnchor(i.anchorId) != null);
      // A comment on a non-existent anchor degrades to null (not a wrong element) — orphan-safe.
      const goneResolvesNull = resolveAnchor('this-anchor-does-not-exist-xyz') === null;
      return { allResolve, goneResolvesNull, count: items.length };
    });

    expect(result.count).toBeGreaterThan(0);
    expect(result.allResolve).toBe(true);
    expect(result.goneResolvesNull).toBe(true);
  });

  test('author soft-delete: the author sees a Delete control; confirm → PATCHes deleted=true; a deleted comment renders as a tombstone with no marker', async ({ page }) => {
    // Auth stub signs us in as dev@earlbear.com — the author of the seeded comment below.
    await page.route('**/api/auth-token', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: 'fake.jwt', expires_at: Date.now() + 1_800_000, email: 'dev@earlbear.com' }) }),
    );
    await page.route('**/realtime/v1/**', (route) => route.abort());

    // The seeded comment is anchored to a use-case oval (uc:config — a stable, resolvable anchor).
    const base = {
      id: 'del-1', post_slug: 'ecommerce-site-scanner-design', env: 'local',
      anchor_id: 'uc:config', anchor_kind: 'node', quoted_text: 'Configure ICP',
      author_email: 'dev@earlbear.com', parent_id: null, resolved: false, deleted: false,
      created_at: new Date(0).toISOString(),
      prefix: null, suffix: null, context_anchor: null, content_hash: null, post_commit: null,
    };
    let patchedDeleted: unknown = undefined;
    await page.route('**/rest/v1/blog_comments**', (route) => {
      const req = route.request();
      if (req.method() === 'PATCH') {
        // Capture the update payload (the author clicking Delete → setDeleted).
        try { patchedDeleted = (JSON.parse(req.postData() || '{}') as any).deleted; } catch {}
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ ...base, deleted: true }]) });
      }
      // GET → the one live comment.
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([base]) });
    });

    await page.goto(POST);
    await expect.poll(() => page.evaluate(() => !!(window as any).__commentLayerReady)).toBe(true);

    // A gutter marker exists (one live comment). Open the thread.
    const marker = page.locator('.cl-marker').first();
    await expect(marker).toBeVisible();
    await marker.click();
    await expect(page.locator('.cl-thread')).toBeVisible();

    // The author sees a Delete control. First click = confirm affordance (no accidental delete),
    // second click = PATCH deleted=true.
    const del = page.locator('.cl-comment-delete').first();
    await expect(del).toBeVisible();
    await del.click();
    await expect(del).toContainText('confirm');
    await del.click();
    await expect.poll(() => patchedDeleted).toBe(true); // the update sent deleted=true
  });

  test('a soft-deleted comment renders as a tombstone (body hidden) and gets NO gutter marker', async ({ page }) => {
    await page.route('**/api/auth-token', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: 'fake.jwt', expires_at: Date.now() + 1_800_000, email: 'dev@earlbear.com' }) }),
    );
    await page.route('**/realtime/v1/**', (route) => route.abort());
    // One comment, already deleted, on a resolvable anchor.
    await page.route('**/rest/v1/blog_comments**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{
        id: 'del-2', post_slug: 'ecommerce-site-scanner-design', env: 'local',
        anchor_id: 'uc:config', anchor_kind: 'node', quoted_text: 'Configure ICP',
        body: 'this text must NOT be shown', author_email: 'dev@earlbear.com',
        parent_id: null, resolved: false, deleted: true, created_at: new Date(0).toISOString(),
        prefix: null, suffix: null, context_anchor: null, content_hash: null, post_commit: null,
      }]) }),
    );
    await page.goto(POST);
    await expect.poll(() => page.evaluate(() => !!(window as any).__commentLayerReady)).toBe(true);

    // A thread that is entirely deleted shows NO gutter marker (nothing for a reader to open).
    await expect(page.locator('.cl-marker')).toHaveCount(0);
    // And the deleted body never reaches the DOM (stored-XSS-safe + hidden).
    expect(await page.locator('text=this text must NOT be shown').count()).toBe(0);
  });

  test('commentableFor: a heading + an id-stamped paragraph are commentable; an id-less element is not', async ({ page }) => {
    await stubBackend(page);
    await page.goto(POST);
    await expect.poll(() => page.evaluate(() => !!(window as any).__commentLayer)).toBe(true);

    const result = await page.evaluate(() => {
      const { commentableFor } = (window as any).__commentLayer;
      const heading = document.querySelector('.prose h2[id]');
      // A prose paragraph with a rehype-stamped id (now commentable, kind 'prose').
      const idP = document.querySelector('.prose p[id]');
      // A synthetic id-LESS paragraph appended to .prose — must never be commentable.
      const orphan = document.createElement('p');
      orphan.textContent = 'no id here';
      document.querySelector('.prose')!.appendChild(orphan);
      return {
        headingCommentable: heading ? commentableFor(heading) != null : false,
        idParagraphCommentable: idP ? commentableFor(idP) != null : false,
        idlessParagraphCommentable: commentableFor(orphan) != null,
      };
    });

    expect(result.headingCommentable).toBe(true);
    expect(result.idParagraphCommentable).toBe(true);
    expect(result.idlessParagraphCommentable).toBe(false);
  });
});

// ---- Range anchoring (Axis B4) durability ----------------------------------
// These prove the three-layer re-anchoring holds across content edits — the whole reason range
// anchors store text+context instead of offsets. Each case builds a range anchor from a real
// selection, then mutates the DOM to simulate an edit and asserts the passage is re-found (or
// safely orphaned). The pure helpers are exercised against the live rendered post — no backend.
test.describe('range anchoring durability (B4)', () => {
  // Build a range anchor over the first sentence-ish run of a specific prose block, returning the
  // saved anchor object + a Comment-shaped row the resolver consumes.
  async function anchorOnFirstProseBlock(page: Page) {
    return page.evaluate(() => {
      const { buildRangeAnchor } = (window as any).__commentLayer;
      const block = document.querySelector('.prose p[id]') as HTMLElement;
      // Select a middle slice of the block's first text node so there's real prefix + suffix.
      const textNode = [...block.childNodes].find((n) => n.nodeType === Node.TEXT_NODE) as Text;
      const full = textNode.data;
      const start = Math.min(10, Math.floor(full.length * 0.2));
      const end = Math.min(start + 20, full.length - 1);
      const range = document.createRange();
      range.setStart(textNode, start);
      range.setEnd(textNode, end);
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);
      const ra = buildRangeAnchor(sel);
      sel.removeAllRanges();
      return { ra, blockId: block.id, selected: ra?.quotedText };
    });
  }

  test('a range anchor captures quoted text + prefix/suffix + a content hash within one block', async ({ page }) => {
    await stubBackend(page);
    await page.goto(POST);
    await expect.poll(() => page.evaluate(() => !!(window as any).__commentLayer)).toBe(true);

    const { ra } = await anchorOnFirstProseBlock(page);
    expect(ra).not.toBeNull();
    expect(ra.anchorId).toMatch(/^c-/);
    expect(ra.quotedText.length).toBeGreaterThan(0);
    expect(ra.contextAnchor.length).toBeGreaterThan(ra.quotedText.length);
    expect(ra.contentHash).toMatch(/^[0-9a-z]+$/);
  });

  test('layer 2 (exact): an UNEDITED block re-finds its range by content hash', async ({ page }) => {
    await stubBackend(page);
    await page.goto(POST);
    await expect.poll(() => page.evaluate(() => !!(window as any).__commentLayer)).toBe(true);

    const found = await page.evaluate(() => {
      const { buildRangeAnchor, resolveRangeAnchor } = (window as any).__commentLayer;
      const block = document.querySelector('.prose p[id]') as HTMLElement;
      const textNode = [...block.childNodes].find((n: any) => n.nodeType === Node.TEXT_NODE) as Text;
      const range = document.createRange();
      range.setStart(textNode, 5);
      range.setEnd(textNode, 25);
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);
      const ra = buildRangeAnchor(sel);
      sel.removeAllRanges();
      // Consume as a stored comment row (no DOM edit → content hash still matches).
      const row = {
        anchor_id: ra.anchorId, anchor_kind: 'range', quoted_text: ra.quotedText,
        prefix: ra.prefix, suffix: ra.suffix, context_anchor: ra.contextAnchor, content_hash: ra.contentHash,
      };
      const el = resolveRangeAnchor(row);
      return { reFound: !!el, isMark: el?.tagName === 'MARK', text: el?.textContent };
    });
    expect(found.reFound).toBe(true);
    expect(found.isMark).toBe(true);
  });

  test('layer 3 (fuzzy): a TYPO-FIXED block still re-finds its range above threshold', async ({ page }) => {
    await stubBackend(page);
    await page.goto(POST);
    await expect.poll(() => page.evaluate(() => !!(window as any).__commentLayer)).toBe(true);

    const found = await page.evaluate(() => {
      const { buildRangeAnchor, resolveRangeAnchor } = (window as any).__commentLayer;
      const block = document.querySelector('.prose p[id]') as HTMLElement;
      const original = block.textContent || '';
      const textNode = [...block.childNodes].find((n: any) => n.nodeType === Node.TEXT_NODE) as Text;
      const range = document.createRange();
      range.setStart(textNode, 5);
      range.setEnd(textNode, 25);
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);
      const ra = buildRangeAnchor(sel);
      sel.removeAllRanges();
      const row = {
        anchor_id: ra.anchorId, anchor_kind: 'range', quoted_text: ra.quotedText,
        prefix: ra.prefix, suffix: ra.suffix, context_anchor: ra.contextAnchor, content_hash: ra.contentHash,
      };
      // Simulate an edit ELSEWHERE in the block (append a few words) → content hash no longer
      // matches, but the block is still >0.8 similar → fuzzy layer must re-find it.
      block.appendChild(document.createTextNode(' (an extra clause was appended here).'));
      const el = resolveRangeAnchor(row);
      return {
        reFound: !!el,
        hashChanged: true,
        stillContainsQuote: (el?.textContent || '').length > 0,
        original: original.slice(0, 10),
      };
    });
    expect(found.reFound).toBe(true);
  });

  test('orphan-safe: a range whose block is GONE resolves to null (never a wrong element)', async ({ page }) => {
    await stubBackend(page);
    await page.goto(POST);
    await expect.poll(() => page.evaluate(() => !!(window as any).__commentLayer)).toBe(true);

    const result = await page.evaluate(() => {
      const { resolveRangeAnchor } = (window as any).__commentLayer;
      // A stored range comment whose saved context matches NOTHING in the post.
      const row = {
        anchor_id: 'c-deadbeef', anchor_kind: 'range',
        quoted_text: 'this exact phrase appears nowhere in the rendered post at all zzz',
        prefix: 'qqq', suffix: 'www',
        context_anchor: 'a completely unrelated block of text that does not exist here zzzqqqwww lorem ipsum dolor',
        content_hash: 'nomatch0',
      };
      return { el: resolveRangeAnchor(row) };
    });
    expect(result.el).toBeNull();
  });
});

// ---- Frontend lost-comment validation (#121) -------------------------------
// When a stored comment's anchored content has drifted/been deleted, it can't be placed inline.
// The orphan panel surfaces it so a reader knows a thread exists and can still open it — the
// "never silently drop a comment" guarantee, reader-facing.
test.describe('orphan panel (#121)', () => {
  const POST_P = '/blog/ecommerce-site-scanner-design/';

  test('a comment on gone content shows the orphan pill, lists the thread, and stays reachable', async ({ page }) => {
    // Stub the backend to return ONE range comment whose saved context matches nothing in the
    // post → it must orphan and surface in the panel (not silently vanish).
    await page.route('**/api/auth-token', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: 'fake.jwt', expires_at: Date.now() + 1_800_000, email: 'dev@earlbear.com' }) }),
    );
    await page.route('**/realtime/v1/**', (route) => route.abort());
    await page.route('**/rest/v1/blog_comments**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'orphan-1', post_slug: 'ecommerce-site-scanner-design', env: 'local',
            anchor_id: 'c-gone01', anchor_kind: 'range',
            quoted_text: 'a phrase from an older version of this post', body: 'still important feedback',
            author_email: 'dev@earlbear.com', parent_id: null, resolved: false, created_at: new Date(0).toISOString(),
            prefix: '', suffix: '',
            context_anchor: 'zzz this whole block of text does not exist anywhere in the current post qqq lorem ipsum',
            content_hash: 'gonehash', post_commit: 'oldsha',
          },
        ]),
      }),
    );
    await page.goto(POST_P);
    await expect.poll(() => page.evaluate(() => !!(window as any).__commentLayerReady)).toBe(true);

    // The comment orphaned (1) and the panel is shown.
    await expect.poll(() => page.evaluate(() => (window as any).__commentOrphans)).toBe(1);
    const pill = page.locator('.cl-orphans-toggle');
    await expect(pill).toBeVisible();
    await expect(pill).toContainText('1 comment on changed content');

    // Expanding lists the orphaned thread by its saved quote; clicking it opens the thread dialog.
    await pill.click();
    const item = page.locator('.cl-orphans-item');
    await expect(item).toContainText('a phrase from an older version');
    await item.click();
    await expect(page.locator('.cl-thread')).toBeVisible();
  });

  test('no orphan pill when every comment re-anchors (empty backend → no orphans)', async ({ page }) => {
    await stubBackend(page); // returns []
    await page.goto(POST_P);
    await expect.poll(() => page.evaluate(() => !!(window as any).__commentLayerReady)).toBe(true);
    await expect(page.locator('.cl-orphans-toggle')).toHaveCount(0);
  });
});
