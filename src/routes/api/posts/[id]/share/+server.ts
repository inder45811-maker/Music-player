import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { requireUser, readJson } from '$lib/server/guard';
import { isBlockedBetween } from '$lib/server/privacy';
import { notify } from '$lib/server/notifications';
import { hashToken } from '$lib/server/crypto';
import type { ShareDestination } from '$lib/types';

interface ShareBody {
  destination: ShareDestination;
  campaign?: string;
  surface?: string; // e.g. 'feed' | 'profile' | 'search'
  metadata?: Record<string, unknown>;
}

const VALID_DESTINATIONS = new Set<ShareDestination>([
  'INTERNAL_FEED',
  'DIRECT_MESSAGE',
  'COPY_LINK',
  'TWITTER',
  'FACEBOOK',
  'INSTAGRAM',
  'WHATSAPP',
  'EMAIL',
  'OTHER'
]);

/**
 * POST /api/posts/[id]/share
 *
 * Records an INDIVIDUAL share event in the fully relational `shares` ledger —
 * explicitly NOT a counter increment. Every action is retained with marketing
 * attribution dimensions (destination, campaign, surface, post author, an
 * anonymised session reference and free-form metadata) so the analytics layer
 * can power viral-trend, ad-targeting and influencer attribution.
 */
export const POST: RequestHandler = async (event) => {
  const me = requireUser(event);
  const postId = event.params.id;
  const body = await readJson<ShareBody>(event);

  if (!body.destination || !VALID_DESTINATIONS.has(body.destination)) {
    throw error(400, 'A valid share destination is required.');
  }

  const post = await db.post.findUnique({ where: { id: postId }, select: { authorId: true } });
  if (!post) throw error(404, 'Post not found.');
  if (await isBlockedBetween(me.id, post.authorId)) throw error(403, 'Not allowed.');

  // Anonymised session correlation id for funnel analysis without exposing the
  // real session token.
  const sessionRef = event.locals.sessionToken
    ? hashToken(event.locals.sessionToken).slice(0, 32)
    : null;

  await db.share.create({
    data: {
      userId: me.id,
      postId,
      destination: body.destination,
      postAuthorId: post.authorId, // influencer attribution snapshot
      campaign: body.campaign?.slice(0, 120) ?? null,
      surface: body.surface?.slice(0, 60) ?? null,
      sessionRef,
      metadata: body.metadata ? (body.metadata as object) : undefined
    }
  });

  await notify({ recipientId: post.authorId, actorId: me.id, type: 'POST_SHARE', postId });

  // We still expose an aggregate for the UI, computed from the ledger.
  const shareCount = await db.share.count({ where: { postId } });
  return json({ ok: true, shareCount }, { status: 201 });
};
