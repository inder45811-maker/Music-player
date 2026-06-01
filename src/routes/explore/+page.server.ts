import type { PageServerLoad } from './$types';
import { explorePosts, trendingHashtags, whoToFollow } from '$lib/server/discovery';

/**
 * Explore — public discovery surface. Works for anonymous visitors too
 * (shows public posts/trends only). Authenticated viewers also get
 * personalised who-to-follow suggestions and like state.
 */
export const load: PageServerLoad = async ({ locals }) => {
  const viewerId = locals.user?.id ?? null;

  const [posts, trending, suggestions] = await Promise.all([
    explorePosts(viewerId, { limit: 24 }),
    trendingHashtags(12),
    viewerId ? whoToFollow(viewerId, 6) : Promise.resolve([])
  ]);

  return { posts, trending, suggestions };
};
