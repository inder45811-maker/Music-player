import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireUser, readJson } from '$lib/server/guard';
import { buildFeed, serializePost, postInclude } from '$lib/server/posts';
import { syncPostHashtags, notifyMentions } from '$lib/server/hashtags';
import type { MediaEntity, Visibility } from '$lib/types';

/**
 * GET /api/posts
 * Returns the authenticated viewer's privacy-filtered feed (cursor paginated).
 */
export const GET: RequestHandler = async (event) => {
  const me = requireUser(event);
  const limit = Number(event.url.searchParams.get('limit') ?? '20');
  const before = event.url.searchParams.get('before') ?? undefined;
  const feed = await buildFeed(me.id, { limit, before });
  return json({ posts: feed });
};

interface CreatePostBody {
  caption?: string;
  media: MediaEntity;
  visibility?: Visibility;
}

/**
 * POST /api/posts
 * Create a media-centric post. Hashtags are parsed from the caption and linked;
 * @mentions trigger notifications. Requires a verified email.
 */
export const POST: RequestHandler = async (event) => {
  const me = requireUser(event);
  const body = await readJson<CreatePostBody>(event);
  const m = body.media;

  if (!m?.provider || !m.providerMediaId || !m.title || !m.mediaType) {
    throw error(400, 'media.provider, mediaType, providerMediaId and title are required.');
  }

  const post = await db.post.create({
    data: {
      authorId: me.id,
      caption: body.caption?.slice(0, 2200) ?? null,
      visibility: body.visibility ?? 'PUBLIC',
      provider: m.provider,
      mediaType: m.mediaType,
      providerMediaId: m.providerMediaId,
      title: m.title,
      artist: m.artist ?? null,
      artworkUrl: m.artworkUrl ?? null,
      durationMs: m.durationMs ?? null,
      externalUrl: m.externalUrl ?? null
    },
    include: postInclude
  });

  await syncPostHashtags(post.id, post.caption);
  await notifyMentions(post.id, me.id, post.caption);

  // Re-fetch with updated hashtag links for an accurate DTO.
  const fresh = await db.post.findUniqueOrThrow({ where: { id: post.id }, include: postInclude });
  return json({ post: serializePost(fresh, false) }, { status: 201 });
};
