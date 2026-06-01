import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { canView, isBlockedBetween } from '$lib/server/privacy';
import { serializePost, postInclude } from '$lib/server/posts';

/**
 * Profile page loader.
 *
 * Enforces the privacy matrix + blocking:
 *   * A block in either direction yields a 404 (existence hidden).
 *   * Profile/post visibility is honoured per-viewer.
 *   * Counts and public lists are visible to all permitted viewers; management
 *     controls are only rendered when the viewer is the owner.
 */
export const load: PageServerLoad = async ({ params, locals }) => {
  const viewerId = locals.user?.id ?? null;

  const profile = await db.user.findUnique({
    where: { username: params.username },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      isPrivate: true,
      profileVisibility: true,
      postVisibility: true
    }
  });
  if (!profile) throw error(404, 'Profile not found.');

  // Hide existence entirely if blocked either way.
  if (viewerId && (await isBlockedBetween(viewerId, profile.id))) {
    throw error(404, 'Profile not found.');
  }

  const isOwner = viewerId === profile.id;
  const canSeeProfile = await canView(viewerId, profile.id, profile.profileVisibility);

  const [followerCount, followingCount] = await Promise.all([
    db.follow.count({ where: { followingId: profile.id, acceptedAt: { not: null } } }),
    db.follow.count({ where: { followerId: profile.id, acceptedAt: { not: null } } })
  ]);

  // Public-safe selector for relationship lists.
  const authorSelect = {
    id: true,
    username: true,
    displayName: true,
    avatarUrl: true
  } as const;

  // Lists + posts are only assembled if the viewer may see the profile.
  let followers: any[] = [];
  let following: any[] = [];
  let pendingRequests: any[] = [];
  let posts: any[] = [];

  if (canSeeProfile) {
    [followers, following] = await Promise.all([
      db.follow
        .findMany({
          where: { followingId: profile.id, acceptedAt: { not: null } },
          select: { follower: { select: authorSelect } },
          take: 50
        })
        .then((r) => r.map((x) => x.follower)),
      db.follow
        .findMany({
          where: { followerId: profile.id, acceptedAt: { not: null } },
          select: { following: { select: authorSelect } },
          take: 50
        })
        .then((r) => r.map((x) => x.following))
    ]);

    // Posts respect post visibility for the viewer.
    const canSeePosts = await canView(viewerId, profile.id, profile.postVisibility);
    if (canSeePosts) {
      const rows = await db.post.findMany({
        where: { authorId: profile.id },
        include: postInclude,
        orderBy: { createdAt: 'desc' },
        take: 24
      });
      const liked = viewerId
        ? new Set(
            (
              await db.like.findMany({
                where: { userId: viewerId, postId: { in: rows.map((p) => p.id) } },
                select: { postId: true }
              })
            ).map((l) => l.postId)
          )
        : new Set<string>();
      posts = rows.map((p) => serializePost(p, liked.has(p.id)));
    }
  }

  // Owner-only: surface pending follow requests for private accounts.
  if (isOwner) {
    pendingRequests = (
      await db.follow.findMany({
        where: { followingId: profile.id, acceptedAt: null },
        select: { follower: { select: authorSelect } },
        take: 50
      })
    ).map((x) => x.follower);
  }

  // Viewer's relationship to this profile (for the Follow button state).
  let viewerFollows = false;
  let viewerPending = false;
  if (viewerId && !isOwner) {
    const f = await db.follow.findUnique({
      where: { followerId_followingId: { followerId: viewerId, followingId: profile.id } },
      select: { acceptedAt: true }
    });
    viewerFollows = f?.acceptedAt != null;
    viewerPending = f != null && f.acceptedAt == null;
  }

  return {
    profile: {
      id: profile.id,
      username: profile.username,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      bio: canSeeProfile ? profile.bio : null,
      isPrivate: profile.isPrivate
    },
    isOwner,
    canSeeProfile,
    followerCount,
    followingCount,
    followers,
    following,
    pendingRequests,
    posts,
    viewerFollows,
    viewerPending
  };
};
