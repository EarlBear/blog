// rehype-block-ids — stamp a stable, content-derived id on every COMMENTABLE structure in a post
// that doesn't already have one, so the comment layer can anchor to it. Originally just prose
// blocks (p/li/blockquote, axis B3); now broadened so a reader can also comment on:
//   - any table, and its rows and cells (not just DecisionTables)
//   - component boxes (callouts, comparison matrices, and other rich blocks)
//   - list items inside those structures
// Every id is `eb-<hash-of-visible-text>`: stable across rebuilds, but it CHANGES if the element's
// text changes — the honest behavior (an edited row orphans its comment to the thread list, exactly
// like a reworded heading). The `data-anchor-kind` attribute records what KIND of thing it is so
// the comment layer + the anchor-ids build hook can reason about it. See docs/comments-design.md
// and the allowlist in src/data/comments.ts.
//
// Zero new deps: a manual hast walk. The Questions aside lives in PostLayout (outside the content
// rehype sees), so it's stamped there directly — see PostLayout.astro.

import { hashText } from '../src/lib/anchor-core.mjs';

// Prose blocks (B3): the original set. A comment can attach to a paragraph/list item/quote.
const PROSE_TAGS = new Set(['p', 'li', 'blockquote']);

// Each rule: an element predicate → the anchor-kind it becomes. Order matters only for reporting;
// an element gets the FIRST matching kind. Cells are matched before rows before tables so the most
// specific structure wins if they ever overlapped (they don't — different tagNames).
function hasClass(node, cls) {
  const c = node.properties?.className;
  return Array.isArray(c) ? c.includes(cls) : typeof c === 'string' && c.split(/\s+/).includes(cls);
}

function classList(node) {
  const c = node.properties?.className;
  return Array.isArray(c) ? c : typeof c === 'string' ? c.split(/\s+/) : [];
}

// A component "box" worth commenting on as a whole: callouts, comparison matrices, mockups,
// personas, decision tables, walkthroughs, etc. Detected by a class ending in a known component
// marker so we don't have to enumerate every one — but scoped to avoid stamping every div.
const COMPONENT_CLASS_RE =
  /^(callout|comparison-matrix|cmp|mockup|persona|personas|walkthrough|decision-table|assumption|data-model|sequence-diagram|use-case)/;

function componentKind(node) {
  if (node.tagName !== 'div' && node.tagName !== 'section' && node.tagName !== 'figure' && node.tagName !== 'aside')
    return null;
  for (const cls of classList(node)) {
    if (COMPONENT_CLASS_RE.test(cls)) return 'component';
  }
  return null;
}

// Collect the visible text of a hast node (its text descendants), collapsed.
function textOf(node) {
  if (node.type === 'text') return node.value;
  if (node.children) return node.children.map(textOf).join('');
  return '';
}

export function rehypeBlockIds() {
  return (tree) => {
    // Per-post de-dupe: if two elements hash the same (identical text), suffix the later ones so
    // ids stay unique within a post.
    const seen = new Map();

    const stamp = (node, kind) => {
      node.properties = node.properties || {};
      if (node.properties.id) {
        // Already has an id (e.g. a heading slug, a DecisionTable row) — just tag its kind so the
        // hook + layer know it's commentable, without overwriting the meaningful id.
        if (!node.properties['data-anchor-kind']) node.properties['data-anchor-kind'] = kind;
        return;
      }
      const text = textOf(node).replace(/\s+/g, ' ').trim();
      if (!text) return; // an empty structural element isn't a comment target
      let id = `eb-${hashText(text)}`;
      const n = seen.get(id) ?? 0;
      seen.set(id, n + 1);
      if (n > 0) id = `${id}-${n}`;
      node.properties.id = id;
      node.properties['data-anchor-kind'] = kind;
    };

    const walk = (node) => {
      if (node.type === 'element') {
        const tag = node.tagName;
        // Kind resolution, most-specific first.
        if (tag === 'td' || tag === 'th') stamp(node, 'cell');
        else if (tag === 'tr') stamp(node, 'row');
        else if (tag === 'table') stamp(node, 'table');
        else if (PROSE_TAGS.has(tag)) stamp(node, 'prose');
        else {
          const ck = componentKind(node);
          if (ck) stamp(node, ck);
        }
      }
      if (node.children) for (const c of node.children) walk(c);
    };
    walk(tree);
  };
}

export default rehypeBlockIds;
