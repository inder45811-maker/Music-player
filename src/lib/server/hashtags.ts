import { db } from './db';
import { notify } from './notifications';

/** Matches `#word` hashtags (letters, numbers, underscore), excluding the '#'. */
const HASHTAG_RE = /#([\p{L}\p{N}_]{1,64})/gu;

/** Extract unique, lower-cased hashtags from a caption. */
export function parseHashtags(text: string | null | undefined): string[] {
  if (!text) return [];
  const tags = new Set<string>();
  for (const match of text.matchAll(HASHTAG_RE)) {
    tags.add(match[1].toLowerCase());
  }
  return [...tags];
}

/** Matches `@username` mentions. */
const MENTION_RE = /@([a-zA-Z0-9_]{1,30})/g;

export function parseMentions(text: string | null | undefined): string[] {
  if (!text) return [];
  const names = new Set<string>();
  for (const match of text.matchAll(MENTION_RE)) names.add(match[1].toLowerCase());
  return [...names];
}

/**
 * Upsert hashtags for a post and (re)link them. Returns the linked tag strings.
 * Hashtags are deduplicated globally via the unique `tag` column.
 */
export async function syncPostHashtags(postId: string, caption: string | null): Promise<string[]> {
  const tags = parseHashtags(caption);

  // Remove existing links so edits stay consistent.
  await db.postHashtag.deleteMany({ where: { postId } });

  for (const tag of tags) {
    const hashtag = await db.hashtag.upsert({
      where: { tag },
      create: { tag },
      update: {}
    });
    await db.postHashtag.create({ data: { postId, hashtagId: hashtag.id } });
  }

  return tags;
}

/**
 * Resolve @mentions in a post caption and emit HASHTAG_MENTION notifications.
 * (Named per the spec's "hashtag mentions" social event.)
 */
export async function notifyMentions(
  postId: string,
  actorId: string,
  caption: string | null
): Promise<void> {
  const usernames = parseMentions(caption);
  if (!usernames.length) return;

  const users = await db.user.findMany({
    where: { username: { in: usernames } },
    select: { id: true }
  });

  await Promise.all(
    users.map((u) =>
      notify({ recipientId: u.id, actorId, type: 'HASHTAG_MENTION', postId })
    )
  );
}
