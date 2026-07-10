// rehype-block-ids — stamp a stable, content-derived id on each prose block (p / li /
// blockquote) that doesn't already have one, so the comment layer can anchor a comment to a
// paragraph, not just to a heading or a component. The id is `eb-<hash-of-text>`, so it is
// stable across rebuilds but changes if the block's text changes — which is the honest
// behavior: editing a paragraph orphans its comments (they fall back to the thread list),
// exactly like a reworded heading. See docs/comments-design.md (anchoring axis B3) and the
// commentable allowlist in src/data/comments.ts.
//
// Zero new dependencies: a manual hast tree walk (no unist-util-visit import needed). A rehype
// plugin is just `() => (tree) => { … }`. Applied to every post via astro.config.mjs.

// hashText is the SHARED FNV-1a from src/lib/anchor-core.mjs — the same hash the browser and the
// build-time reconcile use, so `eb-<hash>` block ids and range content_hashes never disagree.
import { hashText } from '../src/lib/anchor-core.mjs';

// Note: this plugin id's p/li/blockquote (the B3 prose blocks). The reconcile's block set
// (anchor-core BLOCK_TAGS) additionally includes h2/h3 for range context — a superset; fine.
const BLOCK_TAGS = new Set(['p', 'li', 'blockquote']);

// Collect the visible text of a hast node (its text descendants), collapsed.
function textOf(node) {
  if (node.type === 'text') return node.value;
  if (node.children) return node.children.map(textOf).join('');
  return '';
}

export function rehypeBlockIds() {
  return (tree) => {
    // Per-post de-dupe: if two blocks hash the same (identical text), suffix the later ones.
    const seen = new Map();
    const walk = (node) => {
      if (node.type === 'element' && BLOCK_TAGS.has(node.tagName)) {
        node.properties = node.properties || {};
        if (!node.properties.id) {
          const text = textOf(node).replace(/\s+/g, ' ').trim();
          if (text) {
            let id = `eb-${hashText(text)}`;
            const n = seen.get(id) ?? 0;
            seen.set(id, n + 1);
            if (n > 0) id = `${id}-${n}`;
            node.properties.id = id;
          }
        }
      }
      if (node.children) for (const c of node.children) walk(c);
    };
    walk(tree);
  };
}

export default rehypeBlockIds;
