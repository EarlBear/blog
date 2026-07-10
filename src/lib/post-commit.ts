// post-commit — the git SHA that last touched a post's SOURCE file, computed at BUILD time.
//
// This is the range-anchor "version pin" (docs/comments-design.md, Axis B4): when a reader drops
// a range comment, we save the post's current commit alongside the content hash. It's provenance
// — "this comment was made against this version of the post" — used by the build-time reconcile
// to explain drift, NOT as the matcher (content_hash is the matcher). We key on the PER-POST
// commit, not the repo HEAD, so it changes only when this post's file changes — a typo fix in
// post A doesn't bump the pin (or invalidate anchors) for post B.
//
// Runs only in the Astro build (Node), never in the browser. Best-effort: outside a git checkout
// (e.g. a tarball deploy) it returns 'unknown' rather than failing the build — the reconcile
// treats a missing/unknown pin as "no version info", still using content_hash.

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const cache = new Map<string, string>();

/**
 * @param id        the content-collection id (e.g. "comments-that-anchor-to-fragments")
 * @param filePath  Astro's resolved absolute path to the source file, when available
 * @returns short git SHA of the last commit touching that file, or 'unknown'
 */
export function postCommit(id: string, filePath?: string): string {
  const key = filePath || id;
  const cached = cache.get(key);
  if (cached) return cached;

  // Prefer Astro's resolved filePath; fall back to the conventional content path.
  const candidates = [
    filePath,
    resolve(process.cwd(), 'src/content/blog', `${id}.mdx`),
    resolve(process.cwd(), 'src/content/blog', `${id}.md`),
  ].filter((p): p is string => Boolean(p));

  const file = candidates.find((p) => existsSync(p));
  let sha = 'unknown';
  if (file) {
    try {
      sha =
        execFileSync('git', ['log', '-1', '--format=%h', '--', file], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        }).trim() || 'unknown';
    } catch {
      sha = 'unknown';
    }
  }
  cache.set(key, sha);
  return sha;
}
