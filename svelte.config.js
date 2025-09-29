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
      strict: true
    }),
    paths: {
      base: dev ? '' : '/planificacionProcesador'
    },
    prerender: {
      entries: ['/', '/resultados'],
      handleHttpError: ({ path, referrer, message }) => {
        console.warn(`could not prerender ${path} from ${referrer}: ${message}`);
      },
      handleMissingId: ({ path, id, message }) => {
        console.warn(`could not find ${id} referenced from ${path}: ${message}`);
      }
    },
    alias: {
      $lib: './src/lib'
    }
  }
};

export default config;
