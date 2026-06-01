import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { verifyPassword } from '$lib/server/password';
import { createSession } from '$lib/server/session';
import { readJson } from '$lib/server/guard';

interface LoginBody {
  email: string;
  password: string;
}

/**
 * POST /api/auth/login
 * Verifies email/password credentials and establishes a session. Uses a
 * uniform error for both "no such user" and "wrong password" to resist
 * account enumeration, and always runs a hash verification to equalise timing.
 */
export const POST: RequestHandler = async (event) => {
  const body = await readJson<LoginBody>(event);
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? '';

  const user = email
    ? await db.user.findUnique({ where: { email } })
    : null;

  // Dummy hash keeps response time roughly constant when the user is missing.
  const DUMMY_HASH =
    '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHRzb21lc2FsdA$3Vb6oQ9p0r0+e4d3Vxqv3rJ8Wm0lN1Q2W3E4R5T6Y7';
  const hashToCheck = user?.passwordHash ?? DUMMY_HASH;

  const ok = await verifyPassword(hashToCheck, password).catch(() => false);
  if (!user || !user.passwordHash || !ok) {
    throw error(401, 'Invalid email or password.');
  }

  await createSession(user.id, event.cookies, {
    userAgent: event.request.headers.get('user-agent') ?? undefined,
    ipAddress: event.getClientAddress()
  });

  return json({ id: user.id, username: user.username, email: user.email });
};
