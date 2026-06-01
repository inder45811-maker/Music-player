import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireUser, readJson } from '$lib/server/guard';

interface BlockBody {
  targetUserId: string;
}

/**
 * POST /api/blocks
 * Block a user. This severs the relationship in BOTH directions: any existing
 * follow edges are removed, and future visibility/interaction is denied by the
 * privacy layer (`isBlockedBetween`).
 */
export const POST: RequestHandler = async (event) => {
  const me = requireUser(event);
  const { targetUserId } = await readJson<BlockBody>(event);
  if (!targetUserId || targetUserId === me.id) throw error(400, 'Invalid block target.');

  await db.$transaction([
    db.block.upsert({
      where: { blockerId_blockedId: { blockerId: me.id, blockedId: targetUserId } },
      create: { blockerId: me.id, blockedId: targetUserId },
      update: {}
    }),
    // Tear down any mutual follow edges so counts/feeds are immediately clean.
    db.follow.deleteMany({
      where: {
        OR: [
          { followerId: me.id, followingId: targetUserId },
          { followerId: targetUserId, followingId: me.id }
        ]
      }
    })
  ]);

  return json({ ok: true }, { status: 201 });
};

/**
 * DELETE /api/blocks
 * Unblock a previously blocked user. Does NOT restore prior follow edges.
 */
export const DELETE: RequestHandler = async (event) => {
  const me = requireUser(event);
  const { targetUserId } = await readJson<BlockBody>(event);
  if (!targetUserId) throw error(400, 'targetUserId is required.');

  await db.block.deleteMany({ where: { blockerId: me.id, blockedId: targetUserId } });
  return json({ ok: true });
};
