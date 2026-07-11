// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import { devAuthToken } from './integrations/dev-auth-token.ts';
import { rehypeBlockIds } from './integrations/rehype-block-ids.mjs';

// Which site this build is for, chosen by PUBLIC_AUDIENCE (set by the
// build:internal / deploy:internal npm scripts). This picks the canonical
// origin so absolute URLs (canonical, RSS, sitemap) match the host the build
// is actually served on. Unset / anything-but-'internal' → the public site.
const AUDIENCE = process.env.PUBLIC_AUDIENCE === 'internal' ? 'internal' : 'external';
const site =
  AUDIENCE === 'internal'
    ? 'https://blog.internal.earlbear.com'
    : 'https://blog.earlbear.com';

// https://astro.build/config
export default defineConfig({
  // Custom domain serves at the root, so no `base` path.
  site,
  // Local dev + preview run on 4343 (not Astro's default 4321) so this repo's
  // server doesn't collide with other Astro projects on the same machine.
  // `host: false` keeps it bound to localhost. Override per-run with `--port`.
  server: { port: 4343, host: false },
  // mdx lets a post embed Astro components inline (e.g. <UseCaseDiagram/>).
  // Plain markdown posts still render through the same pipeline; mdx only kicks
  // in for .mdx files. No client JS is added — components render at build time.
  integrations: [
    mdx(),
    // DEV/PREVIEW-ONLY: mints a local @earlbear.com token at /api/auth-token so the comment
    // layer is testable in `astro dev` without CF Access. Its only hook is astro:server:setup,
    // which never runs in a real `astro build`, so it adds nothing to a deployed artifact.
    devAuthToken(),
    sitemap({
      // /repo-map/ is an INTERNAL-only standalone page (src/pages/repo-map.astro
      // self-guards to 404 on the external build). The sitemap integration
      // enumerates routes before that runtime guard runs, so on the EXTERNAL
      // build we must drop the URL here — otherwise the public sitemap would
      // advertise an internal-only URL that 404s. It stays in the internal
      // sitemap. This is part of the audience safety net; see
      // docs/features/audience-split.md and .claude/hooks/check-audience.py.
      filter: (page) =>
        AUDIENCE === 'internal' || !/\/repo-map\/?$/.test(page),
    }),
  ],
  // @earlbear/auth-client is a file:-linked package (symlinked outside this tree) that imports
  // @supabase/supabase-js. Node/Rollup would resolve that import from the LINK TARGET's parents,
  // not this app's node_modules, and fail. `dedupe` forces a single supabase-js instance resolved
  // from here — fixing the resolution AND guaranteeing one client instance (no split Realtime/auth).
  vite: {
    resolve: { dedupe: ['@supabase/supabase-js'] },
  },
  markdown: {
    shikiConfig: {
      // Warm light theme; the code-block container is re-skinned to
      // --color-surface-sunken in src/styles/global.css.
      theme: 'github-light',
      wrap: false,
    },
    // Stamp a stable content-hash id onto each prose block (p/li/blockquote) so the
    // internal comment layer can anchor a comment to a paragraph, not just a heading or
    // component. Harmless on the external build (just extra ids). See
    // integrations/rehype-block-ids.mjs + docs/comments-design.md (B3).
    rehypePlugins: [rehypeBlockIds],
  },
});
