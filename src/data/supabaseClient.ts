// The blog's supabase-js client for the internal comment layer. The token-exchange wiring — a
// singleton client whose `accessToken` callback fetches the minted @earlbear.com JWT from
// /api/auth-token, caches it, and refetches before expiry (carried on REST + Realtime) — lives in
// the shared @earlbear/auth-client package, so this file is just the Astro-specific binding: it
// supplies the build-injected PUBLIC_SUPABASE_* env and re-exports the same names this app already
// uses. (gtm's client is the same three-line binding over the same package — no more copy-paste.)
//
// Keys: the build-injected PUBLISHABLE key (import.meta.env.PUBLIC_SUPABASE_*, internal build only) is
// the base apikey; blog_comments has no anon SELECT policy, so it reads nothing without the minted
// token. Offline / external build (no key, no Function) → getSupabase() is null / accessToken fails →
// the comment layer stays inert. See @earlbear/auth-client for the mechanism.
import { createEbSupabaseClient } from '@earlbear/auth-client';

const eb = createEbSupabaseClient({
  url: import.meta.env.PUBLIC_SUPABASE_URL as string,
  publishableKey: import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string,
});

/** The shared client, or null when no Supabase key is configured (external build / offline). */
export const getSupabase = eb.getClient;
/** The signed-in @earlbear.com email once a token has been minted (for display), else null. */
export const currentEmail = eb.currentEmail;
/** Whether a live Supabase client is configured. */
export const hasSupabase = eb.hasClient;
/** Force a token fetch (used to surface the signed-in email eagerly on load). */
export const ensureIdentity = eb.ensureIdentity;
