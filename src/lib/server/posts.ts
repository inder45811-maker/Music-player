import { db } from './db';
import { blockedUserIds } from './privacy';
import type { PostDTO } from '$lib/types';
import type { Prisma } from '@prisma/client';

/**
 * Post serialization + feed assembly.
 *
 * The Prisma include needed to build a {@link PostDTO}. Counts come from
 * relation aggregates so we never store denormalised counters that can drift.
 */
const postInclude = {
  author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
  hashtags: { include: { hashtag: { select: { tag: true } } } },
  _count: { select: { likes: true, shares: true } }
} satisfies Prisma.PostInclude;

type PostWithRelations = Prisma.PostGetPayload<{ include: typeof postInclude }>;

/** Convert a Prisma post (with relations) into the client DTO. */
export function serializePost(post: PostWithRelations, likedByMe: boolean): PostDTO {
  return {
    id: post.id,
    author: post.author,
    caption: post.caption,
    media: {
      provider: post.provider,
      mediaType: post.mediaType,
      providerMediaId: post.providerMediaId,
      title: post.title,
      artist: post.artist,
      artworkUrl: post.artworkUrl,
      durationMs: post.durationMs,
      externalUrl: post.externalUrl
    },
    visibility: post.visibility,
    hashtags: post.hashtags.map((h) => h.hashtag.tag),
    likeCount: post._count.likes,
    shareCount: post._count.shares,
    likedByMe,
    createdAt: post.createdAt.toISOString()
  };
}

/**
 * Build the personalised feed for a viewer.
 *
 * Visibility rules applied:
 *   * Exclude posts from users in a block relationship with the viewer.
 *   * Include PUBLIC posts from anyone.
 *   * Include FOLLOWERS posts only from accounts the viewer accepted-follows.
 *   * Include the viewer's own posts regardless of visibility.
 *
 * Cursor pagination via `before` (a createdAt ISO string).
 */
export async function buildFeed(
  viewerId: string,
  opts: { limit?: number; before?: string } = {}
): Promise<PostDTO[]> {
  const limit = Math.min(opts.limit ?? 20, 50);

  const blocked = await blockedUserIds(viewerId);

  // Ids the viewer accepted-follows (eligible for FOLLOWERS-level posts).
  const following = await db.follow.findMany({
    where: { followerId: viewerId, acceptedAt: { not: null } },
    select: { followingId: true }
  });
  const followingIds = following.map((f) => f.followingId);

  const posts = await db.post.findMany({
    where: {
      authorId: { notIn: blocked.length ? blocked : undefined },
      ...(opts.before ? { createdAt: { lt: new Date(opts.before) } } : {}),
      OR: [
        { visibility: 'PUBLIC' },
        { authorId: viewerId },
        { visibility: 'FOLLOWERS', authorId: { in: followingIds } }
      ]
    },
    include: postInclude,
    orderBy: { createdAt: 'desc' },
    take: limit
  });

  // Which of these the viewer has liked (single query, then map).
  const likedSet = new Set(
    (
      await db.like.findMany({
        where: { userId: viewerId, postId: { in: posts.map((p) => p.id) } },
        select: { postId: true }
      })
    ).map((l) => l.postId)
  );

  return posts.map((p) => serializePost(p, likedSet.has(p.id)));
}

export { postInclude };
