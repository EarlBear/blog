// The blog's first supabase-js client — for the internal comment layer. Two credentials:
//
//   - The build-injected PUBLISHABLE key (import.meta.env.PUBLIC_SUPABASE_URL /
//     PUBLIC_SUPABASE_ANON_KEY, internal build only) — the base `apikey` header. This is the
//     `sb_publishable_*` key, safe to embed; blog_comments has NO anon SELECT policy, so the
//     publishable key alone reads nothing.
//   - A short-lived AUTHENTICATED JWT minted per session by the /api/auth-token CF Pages
//     Function from the verified Cloudflare Access identity (Google SSO, @earlbear.com), handed
//     to supabase-js via the `accessToken` option so REST + Realtime BOTH carry it and RLS can
//     enforce `auth.jwt()->>'email' LIKE '%@earlbear.com'` (and pin the comment author).
//
// The token is ES256-signed with our imported signing key (held only in the CF Pages env /
// local .signing-key.jwk.json); Supabase verifies it against its JWKS. The browser only gets a
// 30-min JWT it re-fetches before expiry. Offline / external build (no key, no Function) →
// accessToken fetch fails → publishable key → reads nothing → the comment layer stays inert.
//
// Ported from the gtm client (src/data/supabaseClient.ts); the only difference is Astro's
// `import.meta.env.PUBLIC_*` instead of gtm's Vite `define` string-replacements.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;

let _client: SupabaseClient | null = null;

// Cached minted token so the accessToken callback (invoked before every request) doesn't hit
// /api/auth-token each time — only when missing or within 60s of expiry.
let _token: string | null = null;
let _tokenExp = 0; // ms epoch
let _email: string | null = null;
let _inflight: Promise<string | null> | null = null;

async function fetchToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/auth-token', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) {
      _token = null;
      _email = null;
      return null;
    }
    const body = (await res.json()) as { token: string; expires_at: number; email: string };
    _token = body.token ?? null;
    _tokenExp = body.expires_at ?? 0;
    _email = body.email ?? null;
    return _token;
  } catch {
    _token = null;
    _email = null;
    return null;
  }
}

// The accessToken callback supabase-js calls to authorize REST + Realtime.
async function accessToken(): Promise<string> {
  if (_token && Date.now() < _tokenExp - 60_000) return _token;
  if (!_inflight) _inflight = fetchToken().finally(() => (_inflight = null));
  const t = await _inflight;
  return t ?? ''; // empty → supabase-js uses the anon apikey (reads nothing)
}

/** The signed-in @earlbear.com email once a token has been minted (for display), else null. */
export function currentEmail(): string | null {
  return _email;
}

/** The shared client, or null when no Supabase key is configured (external build / offline). */
export function getSupabase(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false }, // identity comes from the minted JWT, not Supabase Auth
      realtime: { params: { eventsPerSecond: 10 } },
      accessToken, // supplies the authenticated JWT to REST + Realtime
    });
  }
  return _client;
}

/** Whether a live Supabase client is configured. */
export function hasSupabase(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/** Force a token fetch (used to surface the signed-in email eagerly on load). */
export async function ensureIdentity(): Promise<string | null> {
  await accessToken();
  return _email;
}
