import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireUser } from '$lib/server/guard';
import { globalSearch } from '$lib/server/search';

/**
 * GET /api/search?q=...
 * Unified discovery search across internal users/hashtags and external music
 * APIs (via the viewer's linked accounts).
 */
export const GET: RequestHandler = async (event) => {
  const me = requireUser(event);
  const q = event.url.searchParams.get('q') ?? '';
  const results = await globalSearch(me.id, q);
  return json(results);
};
