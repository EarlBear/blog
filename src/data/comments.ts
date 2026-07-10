// Comment data + anchoring logic for the internal blog's Figma-style comment layer.
// Pure-ish: the allowlist + anchor resolution are DOM helpers (unit-testable via jsdom);
// the CRUD/realtime talk to Supabase through the shared client. See docs/comments-design.md.

import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase, currentEmail } from './supabaseClient';

export type AnchorKind =
  | 'heading'
  | 'decision'
  | 'diagram'
  | 'node'
  | 'entity'
  | 'prose'
  | 'range'
  | 'edge'
  | 'component' // a rich box: callout, comparison matrix, the Questions aside, etc.
  | 'table'
  | 'row' // a table row, or a list item inside a component (e.g. one Question)
  | 'cell';

export interface Comment {
  id: string;
  post_slug: string;
  env: 'local' | 'internal';
  anchor_id: string;
  anchor_kind: AnchorKind;
  quoted_text: string | null;
  body: string;
  author_email: string;
  parent_id: string | null;
  resolved: boolean;
  created_at: string;
  // Range-anchor durability fields (kind 'range' only; NULL for element anchors). See the
  // three-layer model in docs/comments-design.md (Axis B4). Stored as TEXT + CONTEXT, never
  // offsets/line-numbers — those don't survive an edit.
  prefix: string | null; // ~PREFIX_LEN chars immediately before the selection
  suffix: string | null; // ~SUFFIX_LEN chars immediately after the selection
  context_anchor: string | null; // the enclosing block's full text (the fuzzy-match haystack)
  post_commit: string | null; // git SHA of the post source when the comment was made
  content_hash: string | null; // hash of context_anchor at comment time (drift detector)
}

// ---- Shared content-hash primitives ----------------------------------------------------------
// hashText / normalizeText / similarity live in src/lib/anchor-core.mjs — the ONE canonical
// implementation shared by the browser (here), the rehype block-id plugin, and the build-time
// reconcile, so all three agree on when a block's text has drifted. Re-exported so existing
// imports of these from './comments' keep working.
export { hashText, normalizeText, similarity } from '../lib/anchor-core.mjs';
import { hashText, normalizeText, similarity } from '../lib/anchor-core.mjs';

// ---- Commentable-element ALLOWLIST -----------------------------------------
// Only elements that already have a URL fragment (a meaningful content id) are
// commentable. Each entry maps a selector to how we read the element's stable anchor.
// SVG internals (linearGradient/marker/clipPath/title/desc) are NOT here, so they can
// never be commented on — the whole point of an allowlist over a blocklist.
interface AllowRule {
  selector: string;
  kind: AnchorKind;
  anchorOf: (el: Element) => string | null;
  // When set, the kind is read from the element at match time (for the general
  // data-anchor-kind rule, where one selector covers table/row/cell/component).
  kindOf?: (el: Element) => AnchorKind;
}

const ANCHOR_KINDS = new Set<string>([
  'component',
  'table',
  'row',
  'cell',
  'prose',
]);

export const ALLOW_RULES: AllowRule[] = [
  { selector: '.prose h2[id]', kind: 'heading', anchorOf: (el) => el.id || null },
  { selector: '.prose h3[id]', kind: 'heading', anchorOf: (el) => el.id || null },
  // Prose blocks get a stable content-hash id from the rehype-block-ids plugin, so a
  // comment can attach to a paragraph/list-item/quote — not just a heading (B3).
  { selector: '.prose p[id]', kind: 'prose', anchorOf: (el) => el.id || null },
  { selector: '.prose li[id]', kind: 'prose', anchorOf: (el) => el.id || null },
  { selector: '.prose blockquote[id]', kind: 'prose', anchorOf: (el) => el.id || null },
  { selector: '.prose tr.dt-row[id]', kind: 'decision', anchorOf: (el) => el.id || null },
  {
    selector: '.prose figure.flow-diagram[data-flow]',
    kind: 'diagram',
    anchorOf: (el) => el.getAttribute('data-flow'),
  },
  {
    selector: '.prose .flow-node[data-node]',
    kind: 'node',
    anchorOf: (el) => el.getAttribute('data-node'),
  },
  {
    // A diagram EDGE (arrow). data-edge is a stable id from the engine (from__to, NOT the label),
    // so an edge is a fixed comment target whether or not it carries a label — the affordance
    // lands on the arrow's <g> (chip if labeled, line if not; both are inside the same <g>).
    selector: '.prose .flow-edge[data-edge]',
    kind: 'edge',
    anchorOf: (el) => el.getAttribute('data-edge'),
  },
  {
    selector: '.prose .data-model [data-entity]',
    kind: 'entity',
    anchorOf: (el) => el.getAttribute('data-entity'),
  },
  {
    // A UseCaseDiagram use-case OVAL. data-uc is the stable use-case id from the spec. Namespaced
    // `uc:<id>` so the stored anchor can't collide with a FlowDiagram data-node of the same id on
    // the same page. Kind 'node' — a use case is a diagram node you point a comment at, like a
    // flow-node (no new anchor_kind / migration needed).
    selector: '.prose .ucd-oval[data-uc]',
    kind: 'node',
    anchorOf: (el) => {
      const id = el.getAttribute('data-uc');
      return id ? `uc:${id}` : null;
    },
  },
  {
    // A UseCaseDiagram ACTOR (the Earl monogram / stick figure + its label). data-actor is the
    // stable actor id; namespaced `actor:<id>` for the same collision-safety reason.
    selector: '.prose .ucd-actor[data-actor]',
    kind: 'node',
    anchorOf: (el) => {
      const id = el.getAttribute('data-actor');
      return id ? `actor:${id}` : null;
    },
  },
  {
    // The GENERAL rule: any element the build-time stamper tagged with data-anchor-kind is
    // commentable — tables, rows, cells, and rich component boxes (callouts, comparison matrices,
    // the Questions aside). Scoped to `.article` (the whole post) so it also covers the Questions
    // box, which lives in PostLayout OUTSIDE `.prose`. The id is the stamped eb-<hash>; the kind
    // comes from the attribute. Excludes SVG-internal / diagram elements already covered above.
    selector: '.article [id][data-anchor-kind]',
    kind: 'component',
    anchorOf: (el) => el.id || null,
    kindOf: (el) => {
      const k = el.getAttribute('data-anchor-kind') || '';
      return (ANCHOR_KINDS.has(k) ? k : 'component') as AnchorKind;
    },
  },
];

export interface Commentable {
  el: HTMLElement;
  anchorId: string;
  anchorKind: AnchorKind;
  label: string; // short display snapshot of the anchored content
}

/** Every commentable element in `root`, de-duped by anchor id (first wins). */
export function findCommentables(root: ParentNode = document): Commentable[] {
  const seen = new Set<string>();
  const out: Commentable[] = [];
  for (const rule of ALLOW_RULES) {
    root.querySelectorAll(rule.selector).forEach((node) => {
      const el = node as HTMLElement;
      const anchorId = rule.anchorOf(el);
      if (!anchorId || seen.has(anchorId)) return;
      seen.add(anchorId);
      const kind = rule.kindOf ? rule.kindOf(el) : rule.kind;
      out.push({ el, anchorId, anchorKind: kind, label: snapshotText(el) });
    });
  }
  return out;
}

/** True iff `el` (or an ancestor within .prose) is a commentable anchor. Returns its record. */
export function commentableFor(el: Element | null): Commentable | null {
  let node: Element | null = el;
  while (node && node !== document.body) {
    for (const rule of ALLOW_RULES) {
      if (node.matches(rule.selector)) {
        const anchorId = rule.anchorOf(node);
        if (anchorId)
          return {
            el: node as HTMLElement,
            anchorId,
            anchorKind: rule.kindOf ? rule.kindOf(node) : rule.kind,
            label: snapshotText(node),
          };
      }
    }
    node = node.parentElement;
  }
  return null;
}

/** Map a stored anchor_id back to its live element (re-attach on load). Null if gone. */
export function resolveAnchor(anchorId: string): HTMLElement | null {
  // Fragment ids resolve by getElementById; data-* anchors by attribute. Scope to `.article`
  // (not just `.prose`) so anchors on the Questions aside + other component boxes that live
  // OUTSIDE `.prose` still resolve.
  const byId = document.getElementById(anchorId);
  if (byId && byId.closest('.article')) return byId;
  const byFlow = document.querySelector<HTMLElement>(`.prose [data-flow="${cssEscape(anchorId)}"]`);
  if (byFlow) return byFlow;
  const byNode = document.querySelector<HTMLElement>(`.prose [data-node="${cssEscape(anchorId)}"]`);
  if (byNode) return byNode;
  const byEntity = document.querySelector<HTMLElement>(`.prose [data-entity="${cssEscape(anchorId)}"]`);
  if (byEntity) return byEntity;
  const byEdge = document.querySelector<HTMLElement>(`.prose [data-edge="${cssEscape(anchorId)}"]`);
  if (byEdge) return byEdge;
  // UseCaseDiagram ovals/actors carry a namespaced anchor id (uc:<id> / actor:<id>) — strip the
  // prefix and re-find by the matching data-* attribute.
  if (anchorId.startsWith('uc:')) {
    const byUc = document.querySelector<HTMLElement>(`.prose .ucd-oval[data-uc="${cssEscape(anchorId.slice(3))}"]`);
    if (byUc) return byUc;
  }
  if (anchorId.startsWith('actor:')) {
    const byActor = document.querySelector<HTMLElement>(`.prose .ucd-actor[data-actor="${cssEscape(anchorId.slice(6))}"]`);
    if (byActor) return byActor;
  }
  return null;
}

function snapshotText(el: Element): string {
  const t = normalizeText(el.textContent || '');
  return t.length > 80 ? t.slice(0, 77) + '…' : t;
}

// ---- Range anchoring (Axis B4) ---------------------------------------------
// A comment on a free-text SELECTION that has no pre-existing fragment id. We stamp a real id,
// wrap the selection in <mark data-comment-anchor="c-<hash>"> so it's an always-visible,
// re-highlightable landmark, and persist enough CONTEXT (prefix/suffix + the enclosing block's
// text + a content hash) to re-find the passage after the content is edited. See the three
// layers in docs/comments-design.md.

// buildRangeAnchor / wrapRange / resolveRangeAnchor + the three-layer re-anchor now live in the
// shared @earlbear/comments lib (src/range.js). Re-exported here (the lib's defaults ARE the blog's
// .prose selectors) so existing imports of these from './comments' keep working unchanged.
export {
  buildRangeAnchor,
  wrapRange,
  resolveRangeAnchor,
  PREFIX_LEN,
  SUFFIX_LEN,
  FUZZY_THRESHOLD,
} from '@earlbear/comments';
export type { RangeAnchor } from '@earlbear/comments';

function cssEscape(s: string): string {
  // Minimal CSS attribute-value escape (CSS.escape isn't for attribute values).
  return s.replace(/["\\]/g, '\\$&');
}

// ---- Environment partition --------------------------------------------------
/** 'local' on localhost / dev, 'internal' on the deployed internal blog. */
export function currentEnv(): 'local' | 'internal' {
  if (typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname))
    return 'local';
  return 'internal';
}

// ---- CRUD + realtime --------------------------------------------------------
const TABLE = 'blog_comments';

/** Load all comments for a post in the current env, oldest first. */
export async function loadComments(postSlug: string): Promise<Comment[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from(TABLE)
    .select('*')
    .eq('post_slug', postSlug)
    .eq('env', currentEnv())
    .order('created_at', { ascending: true });
  if (error) {
    console.warn('[comments] load failed:', error.message);
    return [];
  }
  return (data ?? []) as Comment[];
}

export interface NewComment {
  postSlug: string;
  anchorId: string;
  anchorKind: AnchorKind;
  quotedText: string | null;
  body: string;
  parentId?: string | null;
  // Range-anchor context (kind 'range' only). Left undefined for element anchors → stored NULL.
  prefix?: string | null;
  suffix?: string | null;
  contextAnchor?: string | null;
  postCommit?: string | null;
  contentHash?: string | null;
}

/** Insert a comment. author_email is pinned by RLS to the JWT email; we send it to satisfy the
 *  with-check. Returns the inserted row or null. */
export async function postComment(c: NewComment): Promise<Comment | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const author = currentEmail();
  if (!author) {
    console.warn('[comments] not signed in — cannot post');
    return null;
  }
  const row = {
    post_slug: c.postSlug,
    env: currentEnv(),
    anchor_id: c.anchorId,
    anchor_kind: c.anchorKind,
    quoted_text: c.quotedText,
    body: c.body,
    author_email: author,
    parent_id: c.parentId ?? null,
    // Range durability fields — NULL for element anchors, populated for kind 'range'.
    prefix: c.prefix ?? null,
    suffix: c.suffix ?? null,
    context_anchor: c.contextAnchor ?? null,
    post_commit: c.postCommit ?? null,
    content_hash: c.contentHash ?? null,
  };
  const { data, error } = await sb.from(TABLE).insert(row).select().single();
  if (error) {
    console.warn('[comments] insert failed:', error.message);
    return null;
  }
  return data as Comment;
}

/** Toggle resolved on a comment the caller authored (RLS enforces ownership). */
export async function setResolved(id: string, resolved: boolean): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from(TABLE).update({ resolved }).eq('id', id);
  if (error) {
    console.warn('[comments] resolve failed:', error.message);
    return false;
  }
  return true;
}

/** Subscribe to realtime changes for a post (current env), calling `onChange` on any insert/
 *  update/delete. Returns the channel so the caller can removeChannel on teardown. */
export function subscribeComments(
  postSlug: string,
  onChange: (payload: { eventType: string; new: Comment | null; old: Comment | null }) => void,
): RealtimeChannel | null {
  const sb = getSupabase();
  if (!sb) return null;
  const channel = sb
    .channel(`blog_comments:${postSlug}:${currentEnv()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE, filter: `post_slug=eq.${postSlug}` },
      (payload: any) => {
        // Server-side filter is on post_slug; also gate on env client-side (the filter grammar
        // takes one column). Realtime still respects RLS for row DELIVERY.
        const row = (payload.new ?? payload.old) as Comment | undefined;
        if (row && row.env !== currentEnv()) return;
        onChange({ eventType: payload.eventType, new: payload.new ?? null, old: payload.old ?? null });
      },
    )
    .subscribe();
  return channel;
}
