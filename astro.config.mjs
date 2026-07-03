// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Custom domain serves at the root, so no `base` path.
  site: 'https://blog.earlbear.com',
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      // Warm light theme; the code-block container is re-skinned to
      // --color-surface-sunken in src/styles/global.css.
      theme: 'github-light',
      wrap: false,
    },
  },
});
