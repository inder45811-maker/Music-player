import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { buildFeed } from '$lib/server/posts';

/**
 * Home feed. Requires authentication; otherwise we route to the marketing/login
 * page. The initial page of the privacy-filtered feed is rendered server-side
 * (SSR) for a fast first paint, then hydrated by the feed store.
 */
export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(302, '/auth/login');
  const posts = await buildFeed(locals.user.id, { limit: 20 });
  return { posts };
};
