import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const dev = process.env.NODE_ENV === 'development';
const repo = 'planificacionProcesador';

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: '404.html' 
    }),
    paths: {
      // En dev = '', en Pages = '/<repo>'
      base: dev ? '' : '/planificacionProcesador'
    },
    prerender: { entries: ['*'] }
  }
};
