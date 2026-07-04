// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  // Custom domain serves at the root, so no `base` path.
  site: 'https://blog.earlbear.com',
  // mdx lets a post embed Astro components inline (e.g. <UseCaseDiagram/>).
  // Plain markdown posts still render through the same pipeline; mdx only kicks
  // in for .mdx files. No client JS is added — components render at build time.
  integrations: [mdx(), sitemap()],
  markdown: {
    shikiConfig: {
      // Warm light theme; the code-block container is re-skinned to
      // --color-surface-sunken in src/styles/global.css.
      theme: 'github-light',
      wrap: false,
    },
  },
});
