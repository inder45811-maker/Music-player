import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireUser } from '$lib/server/guard';
import { isBlockedBetween } from '$lib/server/privacy';
import { notify } from '$lib/server/notifications';

/**
 * POST /api/posts/[id]/like
 * Like a post. The DB unique constraint (userId, postId) enforces the strict
 * one-like-per-user rule; we upsert for idempotency. Returns the fresh count.
 */
export const POST: RequestHandler = async (event) => {
  const me = requireUser(event);
  const postId = event.params.id;

  const post = await db.post.findUnique({ where: { id: postId }, select: { authorId: true } });
  if (!post) throw error(404, 'Post not found.');
  if (await isBlockedBetween(me.id, post.authorId)) throw error(403, 'Not allowed.');

  await db.like.upsert({
    where: { userId_postId: { userId: me.id, postId } },
    create: { userId: me.id, postId },
    update: {}
  });

  await notify({ recipientId: post.authorId, actorId: me.id, type: 'POST_LIKE', postId });

  const likeCount = await db.like.count({ where: { postId } });
  return json({ ok: true, liked: true, likeCount });
};

/**
 * DELETE /api/posts/[id]/like
 * Remove a like (idempotent).
 */
export const DELETE: RequestHandler = async (event) => {
  const me = requireUser(event);
  const postId = event.params.id;

  await db.like.deleteMany({ where: { userId: me.id, postId } });
  const likeCount = await db.like.count({ where: { postId } });
  return json({ ok: true, liked: false, likeCount });
};
