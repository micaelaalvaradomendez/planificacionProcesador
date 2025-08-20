import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const dev = process.argv.includes('dev');
const repo = 'planificacionProcesador';

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html' 
    }),
    paths: {
      // En dev = '', en Pages = '/<repo>'
      base: dev ? '' : `/${repo}`
    },
    prerender: { entries: [] }
  }
};
