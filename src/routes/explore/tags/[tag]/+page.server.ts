import type { PageServerLoad } from './$types';
import { explorePosts } from '$lib/server/discovery';

/** Hashtag detail — public posts grouped under a single tag. */
export const load: PageServerLoad = async ({ params, locals }) => {
  const viewerId = locals.user?.id ?? null;
  const tag = params.tag.toLowerCase();
  const posts = await explorePosts(viewerId, { limit: 48, tag });
  return { tag, posts };
};
