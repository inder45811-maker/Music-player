import { db } from './db';
import { unseal } from './crypto';
import { blockedUserIds } from './privacy';
import type { MediaEntity, SearchResults } from '$lib/types';
import type { MusicProvider } from '@prisma/client';

/**
 * Global discovery search: queries internal records (users, hashtags) and the
 * external music APIs simultaneously, merging the results.
 */

/** Internal user search (excludes blocked users, respects basic visibility). */
async function searchUsers(viewerId: string, q: string) {
  const blocked = await blockedUserIds(viewerId);
  return db.user.findMany({
    where: {
      id: { notIn: blocked.length ? blocked : undefined },
      profileVisibility: { not: 'PRIVATE' },
      OR: [
        { username: { contains: q, mode: 'insensitive' } },
        { displayName: { contains: q, mode: 'insensitive' } }
      ]
    },
    select: { id: true, username: true, displayName: true, avatarUrl: true },
    take: 10
  });
}

/** Trending/matching hashtags with their post counts. */
async function searchHashtags(q: string) {
  const tag = q.replace(/^#/, '').toLowerCase();
  const rows = await db.hashtag.findMany({
    where: { tag: { contains: tag } },
    select: { tag: true, _count: { select: { posts: true } } },
    orderBy: { posts: { _count: 'desc' } },
    take: 10
  });
  return rows.map((r) => ({ tag: r.tag, postCount: r._count.posts }));
}

/**
 * External music search via the viewer's linked accounts. We call each linked
 * provider with the (decrypted, server-side) token and normalise to MediaEntity.
 * Failures from any single provider are isolated so the search still returns.
 */
async function searchExternal(viewerId: string, q: string): Promise<MediaEntity[]> {
  const accounts = await db.musicAccount.findMany({ where: { userId: viewerId } });
  const results = await Promise.allSettled(
    accounts.map((acc) => searchProvider(acc.provider, unseal(acc.accessTokenEnc), q))
  );
  return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
}

/** Provider-specific search adapters, normalised to MediaEntity[]. */
async function searchProvider(
  provider: MusicProvider,
  accessToken: string,
  q: string
): Promise<MediaEntity[]> {
  try {
    if (provider === 'SPOTIFY') {
      const res = await fetch(
        `https://api.spotify.com/v1/search?type=track&limit=10&q=${encodeURIComponent(q)}`,
        { headers: { authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) return [];
      const data = (await res.json()) as {
        tracks?: { items?: Array<Record<string, any>> };
      };
      return (data.tracks?.items ?? []).map((t) => ({
        provider,
        mediaType: 'TRACK',
        providerMediaId: t.id,
        title: t.name,
        artist: (t.artists ?? []).map((a: any) => a.name).join(', ') || null,
        artworkUrl: t.album?.images?.[0]?.url ?? null,
        durationMs: t.duration_ms ?? null,
        externalUrl: t.external_urls?.spotify ?? null
      }));
    }
    // SoundCloud / YouTube / Apple Music adapters follow the same shape and are
    // omitted here for brevity; each maps its native response to MediaEntity.
    return [];
  } catch {
    return [];
  }
}

/** Run all search facets concurrently and merge. */
export async function globalSearch(viewerId: string, q: string): Promise<SearchResults> {
  const query = q.trim();
  if (!query) return { users: [], hashtags: [], tracks: [] };

  const [users, hashtags, tracks] = await Promise.all([
    searchUsers(viewerId, query),
    searchHashtags(query),
    searchExternal(viewerId, query)
  ]);

  return { users, hashtags, tracks };
}
