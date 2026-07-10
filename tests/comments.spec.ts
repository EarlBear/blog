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

  test('the hover affordance is created and appears on a commentable element (regression: TDZ)', async ({ page }) => {
    // Regression guard: initCommentLayer wires the affordance synchronously, referencing `let`s
    // that must be declared before the wiring call. A temporal-dead-zone error there throws
    // silently (the layer "initializes" but the affordance button is never created). This test
    // exercises the FULL init path (not just the exposed pure helpers), so it catches that.
    await stubBackend(page);
    await page.goto(POST);
    await expect.poll(() => page.evaluate(() => !!(window as any).__commentLayerReady)).toBe(true);
    // The affordance button must exist after init (it's appended by wireHoverAffordance).
    await expect.poll(() => page.evaluate(() => !!document.querySelector('.cl-add'))).toBe(true);
    // And it un-hides when a commentable heading is hovered.
    await page.evaluate(() => {
      const h = document.querySelector('.prose h2[id]') as HTMLElement;
      h.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });
    await expect(page.locator('.cl-add')).toBeVisible({ timeout: 2000 });
  });

  test('P6: the commentable allowlist matches fragment-anchored content, never bare <p> or SVG internals', async ({ page }) => {
    await stubBackend(page);
    await page.goto(POST);
    await expect.poll(() => page.evaluate(() => !!(window as any).__commentLayer)).toBe(true);

    const result = await page.evaluate(() => {
      const { findCommentables } = (window as any).__commentLayer;
      const items = findCommentables();
      return {
        count: items.length,
        kinds: [...new Set(items.map((i: any) => i.anchorKind))].sort(),
        // No commentable is a bare <p> (bare paragraphs have no anchor).
        anyBareParagraph: items.some((i: any) => i.el.tagName === 'P'),
        // Every kind is one of the allowed content kinds — never an SVG-internal element.
        onlyAllowedKinds: items.every((i: any) =>
          ['heading', 'decision', 'diagram', 'node', 'entity'].includes(i.anchorKind),
        ),
        // No commentable element is an SVG-internal (gradient/marker/clip/title/desc).
        anySvgInternal: items.some((i: any) =>
          /^(lineargradient|radialgradient|marker|clippath|filter|pattern|mask|title|desc|stop)$/i.test(i.el.tagName),
        ),
      };
    });

    expect(result.count).toBeGreaterThan(0);
    expect(result.anyBareParagraph).toBe(false);
    expect(result.onlyAllowedKinds).toBe(true);
    expect(result.anySvgInternal).toBe(false);
    // The post has headings and a DecisionTable, so those kinds must be present.
    expect(result.kinds).toEqual(expect.arrayContaining(['heading', 'decision']));
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

  test('commentableFor: a heading is commentable; a bare paragraph is not', async ({ page }) => {
    await stubBackend(page);
    await page.goto(POST);
    await expect.poll(() => page.evaluate(() => !!(window as any).__commentLayer)).toBe(true);

    const result = await page.evaluate(() => {
      const { commentableFor } = (window as any).__commentLayer;
      const heading = document.querySelector('.prose h2[id]');
      // A bare paragraph directly under .prose (not inside a commentable).
      const bareP = [...document.querySelectorAll('.prose > p')].find(
        (p) => !(p as HTMLElement).closest('figure,table,.data-model'),
      );
      return {
        headingCommentable: heading ? commentableFor(heading) != null : false,
        bareParagraphCommentable: bareP ? commentableFor(bareP) != null : true,
      };
    });

    expect(result.headingCommentable).toBe(true);
    expect(result.bareParagraphCommentable).toBe(false);
  });
});
