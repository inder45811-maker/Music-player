import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { hashToken } from '$lib/server/crypto';
import { readJson } from '$lib/server/guard';

interface VerifyBody {
  token: string;
}

/**
 * POST /api/auth/verify-email
 * Consumes a single-use email-verification token and marks the email verified.
 */
export const POST: RequestHandler = async (event) => {
  const { token } = await readJson<VerifyBody>(event);
  if (!token) throw error(400, 'Token is required.');

  const record = await db.verificationToken.findUnique({
    where: { tokenHash: hashToken(token) }
  });

  if (
    !record ||
    record.purpose !== 'EMAIL_VERIFY' ||
    record.consumedAt ||
    record.expiresAt.getTime() < Date.now()
  ) {
    throw error(400, 'Invalid or expired verification link.');
  }

  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() }
    }),
    db.verificationToken.update({
      where: { id: record.id },
      data: { consumedAt: new Date() }
    })
  ]);

  return json({ ok: true });
};
