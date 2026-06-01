/**
 * Shared client/server DTO types. These intentionally exclude sensitive fields
 * (password hashes, encrypted tokens) so they are safe to serialise to the
 * browser.
 */
import type {
  MusicProvider,
  MediaType,
  Visibility,
  ShareDestination,
  NotificationType
} from '@prisma/client';

export type { MusicProvider, MediaType, Visibility, ShareDestination, NotificationType };

/** Public-safe author summary embedded in posts/notifications. */
export interface AuthorDTO {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

/** A media entity playable by the unified player. */
export interface MediaEntity {
  provider: MusicProvider;
  mediaType: MediaType;
  providerMediaId: string;
  title: string;
  artist: string | null;
  artworkUrl: string | null;
  durationMs: number | null;
  externalUrl: string | null;
}

/** A feed post as delivered to the client. */
export interface PostDTO {
  id: string;
  author: AuthorDTO;
  caption: string | null;
  media: MediaEntity;
  visibility: Visibility;
  hashtags: string[];
  likeCount: number;
  shareCount: number;
  likedByMe: boolean;
  createdAt: string;
}

export interface NotificationDTO {
  id: string;
  type: NotificationType;
  actor: AuthorDTO | null;
  postId: string | null;
  preview: string | null;
  read: boolean;
  createdAt: string;
}

/** Combined result shape for global discovery search. */
export interface SearchResults {
  users: AuthorDTO[];
  hashtags: { tag: string; postCount: number }[];
  tracks: MediaEntity[];
}
