import { db } from '../db';
import { seal, sign, verifySignature, generateToken } from '../crypto';
import { getProviderConfig, redirectUri } from './providers';
import type { MusicProvider } from '@prisma/client';

/**
 * Backend OAuth proxy for music-provider account federation.
 *
 * Flow (Authorization Code + signed stateless `state`):
 *   1. `buildAuthorizeUrl` — produce the provider authorize URL with a signed
 *      `state` that binds the linking attempt to the current user + a nonce
 *      (CSRF protection for the OAuth dance).
 *   2. Provider redirects back to `/api/oauth/<provider>/callback?code&state`.
 *   3. `exchangeCode` — server-to-server token exchange using the client
 *      secret (never exposed to the browser), then store ENCRYPTED tokens.
 *
 * The browser never sees client secrets nor the raw provider tokens.
 */

interface StatePayload {
  userId: string;
  provider: MusicProvider;
  nonce: string;
}

/** Encode + sign the OAuth state. Format: base64url(json).signature */
function encodeState(payload: StatePayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

/** Verify + decode an OAuth state value. Returns null if tampered. */
export function decodeState(state: string): StatePayload | null {
  const [body, signature] = state.split('.');
  if (!body || !signature || !verifySignature(body, signature)) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as StatePayload;
  } catch {
    return null;
  }
}

/** Build the provider authorize URL for a user initiating an account link. */
export function buildAuthorizeUrl(userId: string, provider: MusicProvider): string {
  const cfg = getProviderConfig(provider);
  const state = encodeState({ userId, provider, nonce: generateToken(16) });

  const params = new URLSearchParams({
    client_id: cfg.clientId,
    response_type: 'code',
    redirect_uri: redirectUri(provider),
    scope: cfg.scopes.join(' '),
    state,
    access_type: 'offline', // request refresh tokens where supported
    prompt: 'consent'
  });

  return `${cfg.authorizeUrl}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

/**
 * Exchange an authorization code for tokens (server-to-server) and persist the
 * encrypted result against the user's MusicAccount.
 */
export async function exchangeCode(
  userId: string,
  provider: MusicProvider,
  code: string
): Promise<void> {
  const cfg = getProviderConfig(provider);

  const res = await fetch(cfg.tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(provider),
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret
    })
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Token exchange failed for ${provider}: ${res.status} ${detail}`);
  }

  const token = (await res.json()) as TokenResponse;
  const expiresAt = token.expires_in
    ? new Date(Date.now() + token.expires_in * 1000)
    : null;

  // We need the provider's user id; most providers return it on a /me call.
  // For brevity we use a placeholder derived from the access token hash; real
  // implementations should call the provider's profile endpoint here.
  const providerUserId = await fetchProviderUserId(provider, token.access_token);

  await db.musicAccount.upsert({
    where: { userId_provider: { userId, provider } },
    create: {
      userId,
      provider,
      providerUserId,
      accessTokenEnc: seal(token.access_token),
      refreshTokenEnc: token.refresh_token ? seal(token.refresh_token) : null,
      scope: token.scope,
      tokenExpiresAt: expiresAt
    },
    update: {
      providerUserId,
      accessTokenEnc: seal(token.access_token),
      refreshTokenEnc: token.refresh_token ? seal(token.refresh_token) : undefined,
      scope: token.scope,
      tokenExpiresAt: expiresAt
    }
  });
}

/** Resolve the provider-native user id for attribution + de-duplication. */
async function fetchProviderUserId(
  provider: MusicProvider,
  accessToken: string
): Promise<string> {
  try {
    const endpoints: Partial<Record<MusicProvider, string>> = {
      SPOTIFY: 'https://api.spotify.com/v1/me',
      SOUNDCLOUD: 'https://api.soundcloud.com/me',
      YOUTUBE: 'https://www.googleapis.com/oauth2/v3/userinfo'
    };
    const url = endpoints[provider];
    if (!url) return `external_${provider.toLowerCase()}`;
    const res = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } });
    if (!res.ok) return `external_${provider.toLowerCase()}`;
    const data = (await res.json()) as { id?: string | number; sub?: string };
    return String(data.id ?? data.sub ?? `external_${provider.toLowerCase()}`);
  } catch {
    return `external_${provider.toLowerCase()}`;
  }
}
