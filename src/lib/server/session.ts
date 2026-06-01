import type { Cookies } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { db } from './db';
import { generateToken, hashToken } from './crypto';

/**
 * Server-side session management.
 *
 * The browser receives only an opaque random token in an HttpOnly, Secure,
 * SameSite=Lax cookie. The database stores just the SHA-256 hash of that
 * token, so the session store cannot be replayed if the DB is exfiltrated.
 */

export const SESSION_COOKIE = 'smp_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

/** Create a session for a user and write the cookie. Returns the raw token. */
export async function createSession(
  userId: string,
  cookies: Cookies,
  meta: { userAgent?: string; ipAddress?: string } = {}
): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      userAgent: meta.userAgent?.slice(0, 512),
      ipAddress: meta.ipAddress,
      expiresAt
    }
  });

  cookies.set(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: !dev,
    expires: expiresAt
  });

  return token;
}

/**
 * Resolve a session token to its user. Returns null for missing/expired tokens
 * and lazily prunes expired records.
 */
export async function validateSession(token: string | undefined) {
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true }
  });

  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session;
}

/** Destroy the current session (logout) and clear the cookie. */
export async function destroySession(token: string | undefined, cookies: Cookies) {
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } }).catch(() => {});
  }
  cookies.delete(SESSION_COOKIE, { path: '/' });
}
