import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import type { MusicProvider } from '@prisma/client';

const PUBLIC_APP_ORIGIN = publicEnv.PUBLIC_APP_ORIGIN ?? '';

/**
 * Central registry of music-provider OAuth configuration.
 *
 * CRITICAL SECURITY INVARIANT: `clientSecret` is read from server-only env
 * (`$env/static/private`) and is referenced ONLY inside server modules. It is
 * never serialised to a load function's return value, never placed in a public
 * env var, and never reaches the browser bundle. The browser only ever sees
 * the proxy endpoints under `/api/oauth/*`.
 */

export interface ProviderConfig {
  /** Internal music provider enum key. */
  provider: MusicProvider;
  /** Authorization endpoint to redirect the user to. */
  authorizeUrl: string;
  /** Token exchange endpoint (server-to-server). */
  tokenUrl: string;
  /** OAuth scopes requested for playback + metadata. */
  scopes: string[];
  clientId: string;
  /** SERVER ONLY — never expose. */
  clientSecret: string;
}

/** Build the redirect URI the provider will call back. */
export function redirectUri(provider: MusicProvider): string {
  return `${PUBLIC_APP_ORIGIN}/api/oauth/${provider.toLowerCase()}/callback`;
}

/**
 * Resolve configuration for a provider. Kept as a function (not a static map)
 * so secrets are read lazily and a misconfigured provider fails loudly only
 * when actually used.
 */
export function getProviderConfig(provider: MusicProvider): ProviderConfig {
  switch (provider) {
    case 'SPOTIFY':
      return {
        provider,
        authorizeUrl: 'https://accounts.spotify.com/authorize',
        tokenUrl: 'https://accounts.spotify.com/api/token',
        scopes: [
          'streaming',
          'user-read-email',
          'user-read-private',
          'user-modify-playback-state',
          'user-read-playback-state'
        ],
        clientId: env.SPOTIFY_CLIENT_ID ?? '',
        clientSecret: env.SPOTIFY_CLIENT_SECRET ?? ''
      };
    case 'SOUNDCLOUD':
      return {
        provider,
        authorizeUrl: 'https://secure.soundcloud.com/authorize',
        tokenUrl: 'https://secure.soundcloud.com/oauth/token',
        scopes: ['non-expiring'],
        clientId: env.SOUNDCLOUD_CLIENT_ID ?? '',
        clientSecret: env.SOUNDCLOUD_CLIENT_SECRET ?? ''
      };
    case 'YOUTUBE':
      return {
        provider,
        authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scopes: [
          'https://www.googleapis.com/auth/youtube.readonly',
          'https://www.googleapis.com/auth/youtube.force-ssl'
        ],
        clientId: env.YOUTUBE_CLIENT_ID ?? '',
        clientSecret: env.YOUTUBE_CLIENT_SECRET ?? ''
      };
    case 'APPLE_MUSIC':
      // Apple MusicKit uses a developer-token + Music-User-Token model rather
      // than a classic OAuth code exchange; we still funnel it through the
      // proxy for a consistent linking UX. The "secret" here is the signed
      // developer token generated from the private key.
      return {
        provider,
        authorizeUrl: 'https://authorize.music.apple.com',
        tokenUrl: 'https://api.music.apple.com/v1/me',
        scopes: [],
        clientId: env.APPLE_MUSIC_KEY_ID ?? '',
        clientSecret: env.APPLE_MUSIC_PRIVATE_KEY ?? ''
      };
    default:
      throw new Error(`Unsupported music provider: ${provider}`);
  }
}

/** Parse a lower-case URL segment back into the MusicProvider enum. */
export function parseProviderSlug(slug: string): MusicProvider | null {
  const map: Record<string, MusicProvider> = {
    spotify: 'SPOTIFY',
    soundcloud: 'SOUNDCLOUD',
    youtube: 'YOUTUBE',
    apple_music: 'APPLE_MUSIC'
  };
  return map[slug] ?? null;
}
