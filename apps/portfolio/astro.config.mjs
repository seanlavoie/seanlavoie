import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// base path matches the GitHub repo name so assets resolve correctly
// on GitHub Pages (seanlavoie.github.io/seanlavoie/).
// When a custom domain is configured in Pages settings, remove `base`
// (or set it to '/') and update profile.ts blog link back to '/blog'.
export default defineConfig({
  integrations: [tailwind()],
  output: 'static',
  site: 'https://seanlavoie.com',
  base: '/seanlavoie',
});
