import { db } from './db';
import { blockedUserIds } from './privacy';
import { serializePost, postInclude } from './posts';
import type { AuthorDTO, PostDTO } from '$lib/types';

/**
 * Discovery helpers powering the desktop right-rail and the Explore grid:
 *   * trending hashtags (by post volume)
 *   * who-to-follow suggestions (popular accounts the viewer doesn't follow)
 *   * a public Explore feed (artwork-forward grid)
 *
 * All viewer-scoped queries exclude blocked relationships.
 */

export interface TrendingTag {
  tag: string;
  postCount: number;
}

/** Top hashtags ranked by number of linked posts. */
export async function trendingHashtags(limit = 8): Promise<TrendingTag[]> {
  const rows = await db.hashtag.findMany({
    select: { tag: true, _count: { select: { posts: true } } },
    orderBy: { posts: { _count: 'desc' } },
    take: limit
  });
  return rows
    .map((r) => ({ tag: r.tag, postCount: r._count.posts }))
    .filter((t) => t.postCount > 0);
}

/**
 * Suggested accounts to follow: public profiles the viewer is not already
 * following (and has no block relationship with), ranked by follower count.
 */
export async function whoToFollow(viewerId: string | null, limit = 5): Promise<AuthorDTO[]> {
  const excludeIds = new Set<string>();
  if (viewerId) {
    excludeIds.add(viewerId);
    for (const id of await blockedUserIds(viewerId)) excludeIds.add(id);
    const following = await db.follow.findMany({
      where: { followerId: viewerId },
      select: { followingId: true }
    });
    for (const f of following) excludeIds.add(f.followingId);
  }

  return db.user.findMany({
    where: {
      id: excludeIds.size ? { notIn: [...excludeIds] } : undefined,
      profileVisibility: 'PUBLIC',
      isPrivate: false
    },
    select: { id: true, username: true, displayName: true, avatarUrl: true },
    orderBy: { followers: { _count: 'desc' } },
    take: limit
  });
}

/**
 * Public Explore feed — recent PUBLIC posts (optionally filtered by hashtag),
 * excluding any author the viewer has a block relationship with.
 */
export async function explorePosts(
  viewerId: string | null,
  opts: { limit?: number; tag?: string } = {}
): Promise<PostDTO[]> {
  const limit = Math.min(opts.limit ?? 24, 60);
  const blocked = viewerId ? await blockedUserIds(viewerId) : [];

  const rows = await db.post.findMany({
    where: {
      visibility: 'PUBLIC',
      authorId: blocked.length ? { notIn: blocked } : undefined,
      ...(opts.tag
        ? { hashtags: { some: { hashtag: { tag: opts.tag.toLowerCase() } } } }
        : {})
    },
    include: postInclude,
    orderBy: { createdAt: 'desc' },
    take: limit
  });

  const likedSet =
    viewerId && rows.length
      ? new Set(
          (
            await db.like.findMany({
              where: { userId: viewerId, postId: { in: rows.map((p) => p.id) } },
              select: { postId: true }
            })
          ).map((l) => l.postId)
        )
      : new Set<string>();

  return rows.map((p) => serializePost(p, likedSet.has(p.id)));
}
