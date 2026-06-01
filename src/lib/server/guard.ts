import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

/**
 * Require an authenticated user inside a `+server.ts` / action. Throws a 401
 * otherwise. Returns the non-null user for ergonomic call sites.
 */
export function requireUser(event: RequestEvent) {
  if (!event.locals.user) {
    throw error(401, 'Authentication required.');
  }
  return event.locals.user;
}

/** Require a verified email for sensitive actions. */
export function requireVerified(event: RequestEvent) {
  const user = requireUser(event);
  if (!user.emailVerifiedAt) {
    throw error(403, 'Please verify your email address first.');
  }
  return user;
}

/** Safely parse a JSON body, throwing a 400 on malformed input. */
export async function readJson<T>(event: RequestEvent): Promise<T> {
  try {
    return (await event.request.json()) as T;
  } catch {
    throw error(400, 'Invalid JSON body.');
  }
}
