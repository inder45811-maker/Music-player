import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { destroySession } from '$lib/server/session';

/**
 * POST /api/auth/logout
 * Revokes the current session server-side and clears the cookie.
 */
export const POST: RequestHandler = async (event) => {
  await destroySession(event.locals.sessionToken ?? undefined, event.cookies);
  return json({ ok: true });
};
