import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// base is /seanlavoie/blog because the repo name is 'seanlavoie' and the
// blog lives under the /blog sub-path.
// When a custom domain is configured in Pages settings, change base to '/blog'.
export default defineConfig({
  integrations: [tailwind(), mdx(), sitemap()],
  output: 'static',
  site: 'https://seanlavoie.com',
  base: '/seanlavoie/blog',
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: false,
    },
  },
});
