import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { hashPassword, validatePasswordStrength } from '$lib/server/password';
import { createSession } from '$lib/server/session';
import { generateToken, hashToken } from '$lib/server/crypto';
import { sendVerificationEmail } from '$lib/server/email';
import { readJson } from '$lib/server/guard';

interface RegisterBody {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;

/**
 * POST /api/auth/register
 * Email/password registration. Creates the user, starts a session and sends a
 * verification email. Responds generically on duplicates to avoid account
 * enumeration where practical.
 */
export const POST: RequestHandler = async (event) => {
  const body = await readJson<RegisterBody>(event);
  const email = body.email?.trim().toLowerCase();
  const username = body.username?.trim();

  if (!email || !EMAIL_RE.test(email)) throw error(400, 'A valid email is required.');
  if (!username || !USERNAME_RE.test(username)) {
    throw error(400, 'Username must be 3–30 chars: letters, numbers, underscore.');
  }
  const pwdError = validatePasswordStrength(body.password ?? '');
  if (pwdError) throw error(400, pwdError);

  // Enforce uniqueness explicitly for clearer UX (DB also has unique indexes).
  const existing = await db.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { email: true }
  });
  if (existing) throw error(409, 'Email or username is already taken.');

  const passwordHash = await hashPassword(body.password);
  const user = await db.user.create({
    data: { email, username, displayName: body.displayName?.trim() || null, passwordHash }
  });

  // Issue an email-verification token (store only the hash).
  const token = generateToken();
  await db.verificationToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      purpose: 'EMAIL_VERIFY',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
    }
  });
  await sendVerificationEmail(email, token);

  await createSession(user.id, event.cookies, {
    userAgent: event.request.headers.get('user-agent') ?? undefined,
    ipAddress: event.getClientAddress()
  });

  return json({ id: user.id, username: user.username, email: user.email }, { status: 201 });
};
