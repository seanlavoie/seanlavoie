import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  integrations: [tailwind(), mdx(), sitemap()],
  output: 'static',
  site: 'https://blog.seanhoots.com', // update to your blog subdomain or path
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: false,
    },
  },
});
