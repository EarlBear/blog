// Comment data + anchoring logic for the internal blog's Figma-style comment layer.
// Pure-ish: the allowlist + anchor resolution are DOM helpers (unit-testable via jsdom);
// the CRUD/realtime talk to Supabase through the shared client. See docs/comments-design.md.

import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase, currentEmail } from './supabaseClient';

export type AnchorKind = 'heading' | 'decision' | 'diagram' | 'node' | 'entity';

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
}

// ---- Commentable-element ALLOWLIST -----------------------------------------
// Only elements that already have a URL fragment (a meaningful content id) are
// commentable. Each entry maps a selector to how we read the element's stable anchor.
// SVG internals (linearGradient/marker/clipPath/title/desc) are NOT here, so they can
// never be commented on — the whole point of an allowlist over a blocklist.
interface AllowRule {
  selector: string;
  kind: AnchorKind;
  anchorOf: (el: Element) => string | null;
}

export const ALLOW_RULES: AllowRule[] = [
  { selector: '.prose h2[id]', kind: 'heading', anchorOf: (el) => el.id || null },
  { selector: '.prose h3[id]', kind: 'heading', anchorOf: (el) => el.id || null },
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
    selector: '.prose .data-model [data-entity]',
    kind: 'entity',
    anchorOf: (el) => el.getAttribute('data-entity'),
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
      out.push({ el, anchorId, anchorKind: rule.kind, label: snapshotText(el) });
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
            anchorKind: rule.kind,
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
  // Fragment ids resolve by getElementById; data-* anchors by attribute.
  const byId = document.getElementById(anchorId);
  if (byId && byId.closest('.prose')) return byId;
  const byFlow = document.querySelector<HTMLElement>(`.prose [data-flow="${cssEscape(anchorId)}"]`);
  if (byFlow) return byFlow;
  const byNode = document.querySelector<HTMLElement>(`.prose [data-node="${cssEscape(anchorId)}"]`);
  if (byNode) return byNode;
  const byEntity = document.querySelector<HTMLElement>(`.prose [data-entity="${cssEscape(anchorId)}"]`);
  if (byEntity) return byEntity;
  return null;
}

function snapshotText(el: Element): string {
  const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
  return t.length > 80 ? t.slice(0, 77) + '…' : t;
}

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
