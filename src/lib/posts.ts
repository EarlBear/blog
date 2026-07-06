import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

/**
 * Which audience this build is for. Chosen at build time by PUBLIC_AUDIENCE:
 *   - 'internal' → the access-gated internal site (blog.internal.earlbear.com)
 *   - anything else / unset → the public external site (blog.earlbear.com)
 * In `astro dev` we ignore this and show every audience so authors see their
 * whole working set on localhost.
 */
const BUILD_AUDIENCE =
  import.meta.env.PUBLIC_AUDIENCE === 'internal' ? 'internal' : 'external';

/** The audience this build targets ('internal' | 'external'). Drives per-site
 *  theming and chrome (see BaseLayout/Nav). In dev the site shows every audience,
 *  but the chrome still reflects the current target ('external' by default). */
export function buildAudience(): 'internal' | 'external' {
  return BUILD_AUDIENCE;
}

/** True when this build targets the internal (access-gated) site. */
export function isInternalBuild(): boolean {
  return BUILD_AUDIENCE === 'internal';
}

/**
 * True if a post belongs in the current build's audience.
 *
 * SECURITY-CRITICAL: this is an allowlist (positive `===` match), never a
 * denylist. On the external build we keep ONLY posts explicitly marked
 * `audience: external` (the schema default). A post with a missing, typo'd, or
 * unknown audience therefore never lands on the public site — it simply
 * disappears from that build. The failure mode is "post vanishes," never
 * "internal post leaks." Do not rewrite this as `!== 'internal'`.
 */
function inBuildAudience(audience: string): boolean {
  return audience === BUILD_AUDIENCE;
}

/**
 * Published posts, newest first.
 *
 * Two independent gates:
 *   - audience: in `astro dev` every audience is shown; in a production build
 *               only posts matching this build's audience are kept (see
 *               inBuildAudience — external is fail-closed). SECURITY-CRITICAL.
 *   - draft:    excluded from the EXTERNAL (public) build so a WIP post never
 *               ships publicly. The INTERNAL site is the org-private working
 *               ground, so it INCLUDES drafts — the internal build only excludes
 *               external posts, showing the whole internal working set (drafts +
 *               published). `astro dev` shows every audience and every draft.
 * Every listing, post page, tag/author page, and the RSS feed derive from this
 * one call, so a post excluded here is excluded from every route and the sitemap.
 */
export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) => {
    if (import.meta.env.DEV) return true; // localhost sees everything
    // Audience gate first (fail-closed on external). This must pass regardless.
    if (!inBuildAudience(data.audience)) return false;
    // Draft gate: only the public site hides drafts; the gated internal site
    // shows them so authors can review WIP behind the login wall.
    if (data.draft && BUILD_AUDIENCE === 'external') return false;
    return true;
  });
  return posts.sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );
}

/** Unique tags across published posts, each with its post count, sorted by count then name. */
export async function getTagsWithCounts(): Promise<{ tag: string; count: number }[]> {
  const posts = await getPublishedPosts();
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** Estimated reading time in minutes (~200 words/min), at least 1. */
export function readingTime(body: string | undefined): number {
  const words = (body ?? '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
