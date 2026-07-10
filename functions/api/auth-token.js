/**
 * CF Access → Supabase token exchange for the INTERNAL blog (Cloudflare Pages Function).
 *
 * GET /api/auth-token — verify the Cloudflare Access JWT, assert @earlbear.com, mint a
 * short-lived Supabase ES256 JWT so comment RLS + Realtime see the identity. Thin wrapper
 * over the shared @earlbear/cf-supabase-auth package (one source of truth with gtm).
 *
 * This is the blog's FIRST Cloudflare Pages Function. It exists only on the internal
 * Cloudflare Pages deploy; the external (public) GitHub Pages build has no server, so the
 * feature is structurally inert there.
 *
 * Env (CF Pages secrets on earlbear-blog-internal):
 *   SUPABASE_SIGNING_KEY   — the EC P-256 private JWK imported into Supabase (kid + d).
 *   CF_ACCESS_TEAM_DOMAIN  — earlbear.cloudflareaccess.com
 *   CF_ACCESS_AUDIENCE     — the BLOG's Access app AUD tag (distinct from gtm's — a wrong
 *                            value denies every mint).
 */
import { handleAuthTokenRequest } from '@earlbear/cf-supabase-auth';

export function onRequestGet({ request, env }) {
  return handleAuthTokenRequest(request, env);
}
