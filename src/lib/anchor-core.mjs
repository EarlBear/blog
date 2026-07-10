// anchor-core — re-exported from the shared @earlbear/comments lib so the blog, its rehype
// block-id plugin, and its reconcile script all use the ONE canonical hash/normalize/similarity.
// Kept as a local module (rather than importing the package everywhere) so the many existing
// relative imports of '../lib/anchor-core.mjs' don't have to change, and so a future blog-only
// tweak has a single seam. The implementation now lives in earlbear-comments/src/anchor-core.js.
export {
  hashText,
  normalizeText,
  similarity,
  BLOCK_TAGS,
  PREFIX_LEN,
  SUFFIX_LEN,
  FUZZY_THRESHOLD,
} from '@earlbear/comments/anchor-core';
