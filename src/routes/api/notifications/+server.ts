import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireUser, readJson } from '$lib/server/guard';
import { markRead } from '$lib/server/notifications';
import type { NotificationDTO } from '$lib/types';

/**
 * GET /api/notifications
 * Poll endpoint for the notification engine. Returns recent notifications plus
 * the unread count for the badge.
 */
export const GET: RequestHandler = async (event) => {
  const me = requireUser(event);
  const limit = Math.min(Number(event.url.searchParams.get('limit') ?? '30'), 100);

  const rows = await db.notification.findMany({
    where: { recipientId: me.id },
    include: {
      actor: { select: { id: true, username: true, displayName: true, avatarUrl: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  });

  const items: NotificationDTO[] = rows.map((n) => ({
    id: n.id,
    type: n.type,
    actor: n.actor,
    postId: n.postId,
    preview: n.preview,
    read: n.readAt != null,
    createdAt: n.createdAt.toISOString()
  }));

  const unread = await db.notification.count({
    where: { recipientId: me.id, readAt: null }
  });

  return json({ notifications: items, unread });
};

/**
 * PATCH /api/notifications
 * Mark notifications as read. Body `{ ids? }` — omit `ids` to mark all read.
 */
export const PATCH: RequestHandler = async (event) => {
  const me = requireUser(event);
  const { ids } = await readJson<{ ids?: string[] }>(event);
  await markRead(me.id, ids);
  return json({ ok: true });
};
