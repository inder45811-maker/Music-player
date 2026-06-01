import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { buildFeed } from '$lib/server/posts';
import { trendingHashtags, whoToFollow } from '$lib/server/discovery';

/**
 * Home feed. Requires authentication; otherwise we route to the login page.
 * The initial page of the privacy-filtered feed plus the desktop right-rail
 * data (trending hashtags + who-to-follow) are rendered server-side for a fast
 * first paint, then hydrated by the client stores.
 */
export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(302, '/auth/login');

  const [posts, trending, suggestions] = await Promise.all([
    buildFeed(locals.user.id, { limit: 20 }),
    trendingHashtags(8),
    whoToFollow(locals.user.id, 5)
  ]);

  return { posts, trending, suggestions };
};
