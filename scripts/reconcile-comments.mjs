#!/usr/bin/env node
// reconcile-comments — the build-time self-heal for range-anchored comments (Axis B4, layer 2).
//
// WHY: a range comment stores the anchored passage as text + context + a content_hash of its
// enclosing block. When the post is edited (a typo fixed, a word added), the block's text — and
// thus its hash — drifts. Rather than make every reader's browser fuzzy-search on load, we
// reconcile ONCE, at edit time, while the diff is known: re-locate each range passage in the NEW
// content and rewrite the stored anchor (new context_anchor + content_hash + post_commit), or —
// if the passage is genuinely gone — FAIL LOUD with enough context to fix it by hand. We never
// silently drop or misplace a comment.
//
// HOW IT RUNS (decided with the user): on-demand (`make reconcile-comments`), NOT on every build.
// It reads the built post HTML from dist/ (the actual rendered output the browser anchors
// against) and reconciles a set of stored range comments provided as JSON on stdin or via
// --comments <file>. The DB read (fetch the rows) and write-back (apply the updates) are done by
// the caller — in this session, through the Supabase MCP; in CI later, a thin service-role
// wrapper. This script is the PURE reconcile ENGINE: HTML in + comments in → a decision per
// comment out (matched / re-anchored-with-new-values / ORPHAN). That keeps the fuzzy logic
// unit-testable and the secret-handling out of it.
//
// EXIT CODES: 0 = every comment matched or was re-anchored. 1 = at least one ORPHAN (a passage no
// longer found) — fail loud. 2 = usage / bad input. The --allow-orphans flag downgrades exit 1 to
// 0 but still prints the orphan report (for a deliberate "I know, archive them" run).
//
// OUTPUT: a JSON report on stdout ({ updates: [...], orphans: [...], matched: n }) so the caller
// can apply `updates` as UPDATEs and decide what to do with `orphans`. Human-readable debug goes
// to stderr.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// The reconcile ENGINE + block extractor now live in the shared @earlbear/comments lib, so any UI
// (not just the blog) reuses the same fail-loud self-heal. This script is the blog's thin CLI over
// it: read the built post's HTML + a comments JSON, run reconcile, print the report, exit loud.
import { reconcile, blocksFromHtml, FUZZY_THRESHOLD } from '@earlbear/comments';

// ---- CLI ------------------------------------------------------------------
// Run the CLI only when invoked directly (`node reconcile-comments.mjs …`); when imported by a
// test, the exports above are all that's needed and main() never runs.
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();

async function main() {
  const args = process.argv.slice(2);
  const flag = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const slug = flag('--slug');
  const distDir = flag('--dist') || 'dist';
  const commentsFile = flag('--comments');
  const allowOrphans = args.includes('--allow-orphans');
  const postCommit = flag('--post-commit') || 'unknown';

  if (!slug) {
    console.error('usage: reconcile-comments --slug <post-slug> [--dist dist] [--comments file.json] [--post-commit sha] [--allow-orphans]');
    console.error('       range comments as JSON (array) on stdin or via --comments.');
    process.exit(2);
  }

  // Load the built post + extract its prose blocks (dist/ is the actual rendered output).
  const htmlPath = resolve(process.cwd(), distDir, 'blog', slug, 'index.html');
  let html;
  try {
    html = readFileSync(htmlPath, 'utf8');
  } catch {
    console.error(`FATAL: cannot read built post at ${htmlPath} — run \`PUBLIC_AUDIENCE=internal npm run build\` first.`);
    process.exit(2);
  }
  const blocks = await blocksFromHtml(html, { rootClass: 'prose' });
  if (blocks.length === 0) {
    console.error(`FATAL: no prose blocks found in ${htmlPath} — is this a real post page with a .prose body?`);
    process.exit(2);
  }

  // Load the range comments to reconcile (JSON array, via --comments or stdin).
  const raw = commentsFile ? readFileSync(resolve(process.cwd(), commentsFile), 'utf8') : readFileSync(0, 'utf8');
  let comments;
  try {
    comments = JSON.parse(raw);
    if (!Array.isArray(comments)) throw new Error('expected a JSON array of comment rows');
  } catch (e) {
    console.error(`FATAL: could not parse comments JSON: ${e.message}`);
    process.exit(2);
  }
  const rangeCount = comments.filter((c) => c.anchor_kind === 'range').length;
  const { matched, updates, orphans } = reconcile(comments, blocks, postCommit);

  // Report: machine-readable JSON on stdout for the caller to apply the UPDATEs.
  console.log(JSON.stringify({ slug, matched, updates, orphans }, null, 2));

  // Human-readable summary + fail-loud debug on stderr.
  console.error(`\nreconcile ${slug}: ${matched} unchanged, ${updates.length} re-anchored, ${orphans.length} orphaned (of ${rangeCount} range comments).`);
  for (const u of updates) {
    console.error(`  ↻ re-anchored ${u.id} (sim ${u.similarity}): "${(u.quoted_text || '').slice(0, 48)}" → hash ${u.new_content_hash}`);
  }
  if (orphans.length) {
    console.error(`\n  ✖ ${orphans.length} ORPHANED — passage no longer found. Reconcile by hand (edit the comment or archive it):`);
    for (const o of orphans) {
      console.error(`    - comment ${o.id} by ${o.author_email}`);
      console.error(`        saved quote:   "${o.quoted_text}"`);
      console.error(`        saved context: "${o.saved_context}…"`);
      console.error(`        closest block: "${o.nearest_block}…" (similarity ${o.nearest_similarity}, below ${FUZZY_THRESHOLD})`);
    }
  }

  if (orphans.length && !allowOrphans) {
    console.error(`\nFAILING: ${orphans.length} comment(s) could not be re-anchored. Fix them, or re-run with --allow-orphans to archive.`);
    process.exit(1);
  }
  process.exit(0);
}
