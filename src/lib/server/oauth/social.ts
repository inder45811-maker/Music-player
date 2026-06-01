import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { db } from '../db';

const PUBLIC_APP_ORIGIN = publicEnv.PUBLIC_APP_ORIGIN ?? '';
import { sign, verifySignature, generateToken } from '../crypto';
import type { AuthProvider } from '@prisma/client';

/**
 * Social login (Sign in with Google / Apple).
 *
 * Distinct from music federation: this AUTHENTICATES the user (creates/links a
 * platform account), rather than linking a music library. Same security model:
 * the client secret stays server-side; `state` is signed for CSRF protection.
 */

interface SocialConfig {
  provider: AuthProvider;
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
  clientId: string;
  clientSecret: string;
}

export function socialRedirectUri(provider: AuthProvider): string {
  return `${PUBLIC_APP_ORIGIN}/api/auth/social/${provider.toLowerCase()}/callback`;
}

export function getSocialConfig(provider: AuthProvider): SocialConfig {
  switch (provider) {
    case 'GOOGLE':
      return {
        provider,
        authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
        scopes: ['openid', 'email', 'profile'],
        clientId: env.GOOGLE_CLIENT_ID ?? '',
        clientSecret: env.GOOGLE_CLIENT_SECRET ?? ''
      };
    case 'APPLE':
      return {
        provider,
        authorizeUrl: 'https://appleid.apple.com/auth/authorize',
        tokenUrl: 'https://appleid.apple.com/auth/token',
        userInfoUrl: '', // Apple returns identity in the id_token JWT itself.
        scopes: ['name', 'email'],
        clientId: env.APPLE_CLIENT_ID ?? '',
        // For Apple this is the signed client secret JWT (generated from the key).
        clientSecret: env.APPLE_PRIVATE_KEY ?? ''
      };
    default:
      throw new Error(`Unsupported auth provider: ${provider}`);
  }
}

export function parseSocialSlug(slug: string): AuthProvider | null {
  const map: Record<string, AuthProvider> = { google: 'GOOGLE', apple: 'APPLE' };
  return map[slug] ?? null;
}

export function buildSocialAuthorizeUrl(provider: AuthProvider): string {
  const cfg = getSocialConfig(provider);
  const nonce = generateToken(16);
  const state = `${nonce}.${sign(nonce)}`;
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: socialRedirectUri(provider),
    response_type: 'code',
    scope: cfg.scopes.join(' '),
    state,
    ...(provider === 'APPLE' ? { response_mode: 'form_post' } : {})
  });
  return `${cfg.authorizeUrl}?${params.toString()}`;
}

export function verifySocialState(state: string | null): boolean {
  if (!state) return false;
  const [nonce, signature] = state.split('.');
  return Boolean(nonce && signature && verifySignature(nonce, signature));
}

interface IdentityProfile {
  providerUserId: string;
  email: string | null;
  name: string | null;
}

/** Exchange the code and resolve the external identity profile. */
export async function resolveSocialIdentity(
  provider: AuthProvider,
  code: string
): Promise<IdentityProfile> {
  const cfg = getSocialConfig(provider);

  const tokenRes = await fetch(cfg.tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: socialRedirectUri(provider),
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret
    })
  });
  if (!tokenRes.ok) throw new Error(`Social token exchange failed: ${tokenRes.status}`);
  const token = (await tokenRes.json()) as { access_token: string; id_token?: string };

  if (provider === 'GOOGLE') {
    const infoRes = await fetch(cfg.userInfoUrl, {
      headers: { authorization: `Bearer ${token.access_token}` }
    });
    const info = (await infoRes.json()) as { sub: string; email?: string; name?: string };
    return { providerUserId: info.sub, email: info.email ?? null, name: info.name ?? null };
  }

  // Apple: decode the id_token JWT claims (signature verification against
  // Apple's JWKS should be added in production).
  const claims = decodeJwtClaims(token.id_token ?? '');
  return {
    providerUserId: String(claims.sub ?? ''),
    email: (claims.email as string) ?? null,
    name: null
  };
}

function decodeJwtClaims(jwt: string): Record<string, unknown> {
  const parts = jwt.split('.');
  if (parts.length < 2) return {};
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return {};
  }
}

/**
 * Find or create a platform user for a resolved social identity, linking the
 * SocialAccount. Returns the user id for session creation.
 */
export async function upsertSocialUser(
  provider: AuthProvider,
  identity: IdentityProfile
): Promise<string> {
  // 1. Existing social link?
  const existingLink = await db.socialAccount.findUnique({
    where: {
      provider_providerUserId: { provider, providerUserId: identity.providerUserId }
    },
    select: { userId: true }
  });
  if (existingLink) return existingLink.userId;

  // 2. Existing user with the same verified email? Link the provider to it.
  if (identity.email) {
    const byEmail = await db.user.findUnique({ where: { email: identity.email.toLowerCase() } });
    if (byEmail) {
      await db.socialAccount.create({
        data: { userId: byEmail.id, provider, providerUserId: identity.providerUserId }
      });
      return byEmail.id;
    }
  }

  // 3. Brand-new user. Generate a unique username from the email/name.
  const base =
    (identity.email?.split('@')[0] ?? identity.name ?? 'user')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 20) || 'user';
  let username = base;
  for (let i = 0; await db.user.findUnique({ where: { username }, select: { id: true } }); i++) {
    username = `${base}${Math.floor(Math.random() * 10000)}`;
    if (i > 5) {
      username = `${base}_${generateToken(4)}`;
      break;
    }
  }

  const user = await db.user.create({
    data: {
      email: identity.email?.toLowerCase() ?? `${generateToken(8)}@social.local`,
      // Email arriving from a verified IdP is treated as verified.
      emailVerifiedAt: identity.email ? new Date() : null,
      username,
      displayName: identity.name,
      socialAccounts: { create: { provider, providerUserId: identity.providerUserId } }
    }
  });
  return user.id;
}
