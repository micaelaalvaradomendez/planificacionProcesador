import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const dev = process.env.NODE_ENV === 'development';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: undefined,
      precompress: false,
      strict: false
    }),
    paths: {
      base: dev ? '' : '/planificacionProcesador'
    },
    prerender: {
      entries: ['/', '/resultados'],
      handleHttpError: 'warn',
      handleMissingId: 'warn',
      crawl: false
    },
    alias: {
      $lib: './src/lib'
    }
  }
};

export default config;
