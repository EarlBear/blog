// DEV/PREVIEW-ONLY Astro integration that mints a local Supabase identity token at
// /api/auth-token. In production that path is the Cloudflare Pages Function
// (functions/api/auth-token.js) which verifies the CF Access JWT; locally there is no CF
// Access, so this fills the gap for LOCAL DEV ONLY — it mints the SAME ES256 token the prod
// Function would, from the operator's local signing key, so `astro dev` can exercise the
// comment layer against the live gated table.
//
// WHY THIS IS SAFE:
//   • Registered ONLY via the astro:server:setup hook (dev + `astro preview`), which adds Vite
//     middleware. A real `astro build` never runs this hook, so the endpoint cannot exist in a
//     deployed artifact.
//   • Minting needs the signing key, which lives on the operator's laptop
//     (.signing-key.jwk.json / env SUPABASE_SIGNING_KEY), never in the bundle. No key → 401,
//     exactly like prod with no CF Access, so a keyless machine sees the secure empty default.
//   • The minted token is a genuinely valid @earlbear.com identity (JWKS-verifiable) — it does
//     NOT weaken RLS; it self-issues the identity CF Access would have vouched for.
//
// Mirrors gtm's vite-plugins/dev-auth-token.ts, re-expressed as an Astro integration and using
// the shared @earlbear/cf-supabase-auth mint. Identity defaults to EB_DEV_LOGIN_EMAIL (or
// dev@earlbear.com).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AstroIntegration } from 'astro';
import { parseSigningJWK, signSupabaseJWT } from '@earlbear/cf-supabase-auth';

const PATH = '/api/auth-token';

function loadSigningJWK(root: string) {
  if (process.env.SUPABASE_SIGNING_KEY) return parseSigningJWK(process.env.SUPABASE_SIGNING_KEY);
  return parseSigningJWK(readFileSync(resolve(root, '.signing-key.jwk.json'), 'utf8'));
}

// A Connect-style middleware (req, res, next) added to Astro's dev Vite server.
function makeHandler(root: string) {
  return (req: any, res: any, next: () => void) => {
    const url = req.url || '';
    if (!url.startsWith(PATH)) return next();

    const email = (process.env.EB_DEV_LOGIN_EMAIL || 'dev@earlbear.com').toLowerCase();
    const json = (status: number, body: unknown) => {
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(body));
    };

    let jwk;
    try {
      jwk = loadSigningJWK(root);
    } catch {
      // No signing key on this machine → behave like prod with no session: 401, secure empty.
      return json(401, { error: 'no local signing key (.signing-key.jwk.json) — dev auto-login off' });
    }

    signSupabaseJWT(email, jwk)
      .then(({ token, expires_at }) => {
        // Loud breadcrumb so a DEV identity is never minted silently.
        console.log(`[dev-auth-token] minted a DEV @earlbear.com token for ${email} (local only)`);
        json(200, { token, expires_at, email, dev: true });
      })
      .catch((err) => json(500, { error: `dev mint failed: ${err?.message || err}` }));
  };
}

/** DEV/PREVIEW-ONLY: mint a local @earlbear.com token at /api/auth-token. Never in a real build. */
export function devAuthToken(): AstroIntegration {
  return {
    name: 'eb-dev-auth-token',
    hooks: {
      'astro:server:setup': ({ server }) => {
        server.middlewares.use(makeHandler(server.config.root));
      },
    },
  };
}
