import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireUser, readJson } from '$lib/server/guard';
import { isBlockedBetween } from '$lib/server/privacy';
import { notify } from '$lib/server/notifications';

interface FollowBody {
  targetUserId: string;
}

/**
 * POST /api/follows
 * Follow a user. For private accounts the follow is created as a pending
 * request (`acceptedAt` null) and a FOLLOW_REQUEST notification is sent;
 * otherwise it is auto-accepted and a NEW_FOLLOWER notification is sent.
 */
export const POST: RequestHandler = async (event) => {
  const me = requireUser(event);
  const { targetUserId } = await readJson<FollowBody>(event);

  if (!targetUserId || targetUserId === me.id) {
    throw error(400, 'Invalid follow target.');
  }
  if (await isBlockedBetween(me.id, targetUserId)) {
    throw error(403, 'Cannot follow this user.');
  }

  const target = await db.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, isPrivate: true }
  });
  if (!target) throw error(404, 'User not found.');

  const acceptedAt = target.isPrivate ? null : new Date();

  const follow = await db.follow.upsert({
    where: { followerId_followingId: { followerId: me.id, followingId: targetUserId } },
    create: { followerId: me.id, followingId: targetUserId, acceptedAt },
    update: {} // idempotent: re-following keeps the existing state
  });

  await notify({
    recipientId: targetUserId,
    actorId: me.id,
    type: target.isPrivate ? 'FOLLOW_REQUEST' : 'NEW_FOLLOWER'
  });

  return json({ ok: true, pending: follow.acceptedAt === null }, { status: 201 });
};

interface UnfollowQuery {
  targetUserId: string;
}

/**
 * DELETE /api/follows
 * Unfollow a user, or (owner action) remove one of your own followers.
 * Body: `{ targetUserId }` to unfollow; `{ removeFollowerId }` to remove.
 */
export const DELETE: RequestHandler = async (event) => {
  const me = requireUser(event);
  const body = await readJson<Partial<{ targetUserId: string; removeFollowerId: string }>>(event);

  if (body.removeFollowerId) {
    // Owner-only: forcibly remove a follower of MY account.
    await db.follow.deleteMany({
      where: { followerId: body.removeFollowerId, followingId: me.id }
    });
    return json({ ok: true, action: 'removed_follower' });
  }

  if (body.targetUserId) {
    await db.follow.deleteMany({
      where: { followerId: me.id, followingId: body.targetUserId }
    });
    return json({ ok: true, action: 'unfollowed' });
  }

  throw error(400, 'Provide targetUserId or removeFollowerId.');
};

/**
 * PATCH /api/follows
 * Accept or reject a pending follow request directed at MY account.
 * Body: `{ followerId, accept: boolean }`.
 */
export const PATCH: RequestHandler = async (event) => {
  const me = requireUser(event);
  const { followerId, accept } = await readJson<{ followerId: string; accept: boolean }>(event);
  if (!followerId) throw error(400, 'followerId is required.');

  const pending = await db.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId: me.id } }
  });
  if (!pending) throw error(404, 'No such follow request.');

  if (accept) {
    await db.follow.update({
      where: { id: pending.id },
      data: { acceptedAt: new Date() }
    });
    await notify({ recipientId: followerId, actorId: me.id, type: 'NEW_FOLLOWER' });
    return json({ ok: true, accepted: true });
  }

  await db.follow.delete({ where: { id: pending.id } });
  return json({ ok: true, accepted: false });
};
