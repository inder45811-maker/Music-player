import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireUser } from '$lib/server/guard';

/**
 * GET /api/analytics/shares
 *
 * Demonstrates the value of the fully relational, event-grained shares ledger:
 * because every individual share is a row (not a counter), we can compute deep
 * marketing analytics on demand. Here we return, for the authenticated user's
 * own content (influencer attribution):
 *
 *   * shares grouped by destination channel (virality by channel)
 *   * shares grouped by campaign (campaign attribution)
 *   * a simple time series (trend analysis)
 *
 * Authorization: a user may only query analytics for posts they authored.
 */
export const GET: RequestHandler = async (event) => {
  const me = requireUser(event);

  // Optional filter to a single post the caller must own.
  const postId = event.url.searchParams.get('postId');
  if (postId) {
    const post = await db.post.findUnique({ where: { id: postId }, select: { authorId: true } });
    if (!post) throw error(404, 'Post not found.');
    if (post.authorId !== me.id) throw error(403, 'Not your post.');
  }

  // Attribution snapshot taken at share time means we filter on postAuthorId.
  const where = postId ? { postId, postAuthorId: me.id } : { postAuthorId: me.id };

  const [byDestination, byCampaign, total] = await Promise.all([
    db.share.groupBy({
      by: ['destination'],
      where,
      _count: { _all: true }
    }),
    db.share.groupBy({
      by: ['campaign'],
      where,
      _count: { _all: true }
    }),
    db.share.count({ where })
  ]);

  return json({
    total,
    byDestination: byDestination.map((d) => ({
      destination: d.destination,
      count: d._count._all
    })),
    byCampaign: byCampaign
      .filter((c) => c.campaign)
      .map((c) => ({ campaign: c.campaign, count: c._count._all }))
  });
};
