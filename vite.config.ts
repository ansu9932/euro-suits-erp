import { readdirSync } from 'node:fs';
import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import nodeAdapter from '@sveltejs/adapter-node';
import cloudflareAdapter from '@sveltejs/adapter-cloudflare';

// Pages has a limit on routing rules. One wildcard covers each static asset directory.
const staticRoutes = readdirSync(new URL('./static/', import.meta.url), {withFileTypes: true})
 .map(entry => '/' + entry.name + (entry.isDirectory() ? '/*' : ''));

const pages = process.env.DEPLOY_TARGET === 'cloudflare';

export default defineConfig({
 define: {'import.meta.env.ERP_PAGES_BUILD': JSON.stringify(pages)},
 plugins: [sveltekit({
  preprocess: vitePreprocess(),
  adapter: pages ? cloudflareAdapter({
   routes: {exclude: ['<build>', '<prerendered>', '<redirects>', ...staticRoutes]}
  }) : nodeAdapter(),
  csp: {mode:'auto', directives: {
   'default-src':['self'],
   'script-src':['self','https://challenges.cloudflare.com'],
   'style-src':['self','unsafe-inline'],
   'img-src':['self','data:','blob:'],
   'font-src':['self'],
   'connect-src':['self'],
   'frame-src':['https://challenges.cloudflare.com'],
   'worker-src':['self'],
   'frame-ancestors':['none'],
   'object-src':['none'],
   'base-uri':['self'],
   'form-action':['self']
  }}
 })],
 // The ERP font policy allows only same-origin font URLs.
 build: {assetsInlineLimit: file => /\.woff2?$/i.test(file) ? false : undefined},
 server: {
  port: 5173,
  strictPort: true,
  proxy: {'/api': {target: process.env.ERP_API_TARGET || 'http://127.0.0.1:8081'}}
 }
});
