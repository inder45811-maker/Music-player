import { db } from './db';
import { isBlockedBetween } from './privacy';
import type { NotificationType } from '@prisma/client';

/**
 * Notification engine helpers.
 *
 * Notifications are persisted rows consumed by the client either via polling
 * (`GET /api/notifications`) or a future push channel. Creation is centralised
 * here so blocking + self-notification suppression are always applied.
 */

export async function notify(params: {
  recipientId: string;
  actorId?: string;
  type: NotificationType;
  postId?: string;
  preview?: string;
}): Promise<void> {
  const { recipientId, actorId, type, postId, preview } = params;

  // Never notify yourself about your own action.
  if (actorId && actorId === recipientId) return;

  // Suppress notifications between users with a block relationship.
  if (actorId && (await isBlockedBetween(actorId, recipientId))) return;

  await db.notification.create({
    data: { recipientId, actorId, type, postId, preview }
  });
}

/** Mark a set (or all) of a user's notifications as read. */
export async function markRead(userId: string, ids?: string[]): Promise<void> {
  await db.notification.updateMany({
    where: {
      recipientId: userId,
      readAt: null,
      ...(ids && ids.length ? { id: { in: ids } } : {})
    },
    data: { readAt: new Date() }
  });
}

/** Count unread notifications — drives the badge in the UI. */
export function unreadCount(userId: string): Promise<number> {
  return db.notification.count({ where: { recipientId: userId, readAt: null } });
}
