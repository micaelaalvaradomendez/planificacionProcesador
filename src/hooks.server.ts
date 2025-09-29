import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  // Redirect root to base path in production
  if (event.url.pathname === '/' && base) {
    throw redirect(301, base);
  }

  return resolve(event);
};
