import { db } from './db';
import type { Visibility } from '@prisma/client';

/**
 * Centralised privacy / data-isolation logic.
 *
 * Every read path that exposes another user's content MUST funnel through these
 * helpers so the rules are enforced consistently:
 *   * Blocks sever visibility in BOTH directions.
 *   * Visibility levels: PUBLIC | FOLLOWERS | PRIVATE.
 */

/** True if either user has blocked the other. */
export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
  if (a === b) return false;
  const block = await db.block.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a }
      ]
    },
    select: { id: true }
  });
  return block !== null;
}

/** True if `viewerId` is an accepted follower of `ownerId`. */
export async function isAcceptedFollower(
  viewerId: string,
  ownerId: string
): Promise<boolean> {
  const follow = await db.follow.findUnique({
    where: { followerId_followingId: { followerId: viewerId, followingId: ownerId } },
    select: { acceptedAt: true }
  });
  return follow?.acceptedAt != null;
}

/**
 * Resolve whether `viewerId` (may be null for anonymous) can see content owned
 * by `ownerId` at the given visibility level.
 */
export async function canView(
  viewerId: string | null,
  ownerId: string,
  visibility: Visibility
): Promise<boolean> {
  // The owner can always see their own content.
  if (viewerId && viewerId === ownerId) return true;

  // A block in either direction hides everything.
  if (viewerId && (await isBlockedBetween(viewerId, ownerId))) return false;

  switch (visibility) {
    case 'PUBLIC':
      return true;
    case 'FOLLOWERS':
      return viewerId != null && (await isAcceptedFollower(viewerId, ownerId));
    case 'PRIVATE':
      return false;
    default:
      return false;
  }
}

/**
 * Produce a Prisma `where` fragment that excludes any author who has a block
 * relationship with the viewer. Used to keep blocked users out of feeds/search.
 */
export async function blockedUserIds(viewerId: string): Promise<string[]> {
  const blocks = await db.block.findMany({
    where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
    select: { blockerId: true, blockedId: true }
  });
  const ids = new Set<string>();
  for (const b of blocks) {
    ids.add(b.blockerId === viewerId ? b.blockedId : b.blockerId);
  }
  return [...ids];
}
