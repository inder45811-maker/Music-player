import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { generateToken, hashToken } from '$lib/server/crypto';
import { hashPassword, validatePasswordStrength } from '$lib/server/password';
import { sendPasswordResetEmail } from '$lib/server/email';
import { readJson } from '$lib/server/guard';

interface RequestBody {
  // Request phase: provide email. Confirm phase: provide token + newPassword.
  email?: string;
  token?: string;
  newPassword?: string;
}

/**
 * POST /api/auth/password-reset
 *
 * Dual-purpose endpoint:
 *   * `{ email }`               -> issue a reset token (always 200 to avoid
 *                                  account enumeration).
 *   * `{ token, newPassword }`  -> consume token + set the new password and
 *                                  invalidate all existing sessions.
 */
export const POST: RequestHandler = async (event) => {
  const body = await readJson<RequestBody>(event);

  // --- Confirm phase -------------------------------------------------------
  if (body.token) {
    const pwdError = validatePasswordStrength(body.newPassword ?? '');
    if (pwdError) throw error(400, pwdError);

    const record = await db.verificationToken.findUnique({
      where: { tokenHash: hashToken(body.token) }
    });
    if (
      !record ||
      record.purpose !== 'PASSWORD_RESET' ||
      record.consumedAt ||
      record.expiresAt.getTime() < Date.now()
    ) {
      throw error(400, 'Invalid or expired reset link.');
    }

    const passwordHash = await hashPassword(body.newPassword!);
    await db.$transaction([
      db.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      db.verificationToken.update({
        where: { id: record.id },
        data: { consumedAt: new Date() }
      }),
      // Revoke every active session — force re-login everywhere.
      db.session.deleteMany({ where: { userId: record.userId } })
    ]);

    return json({ ok: true });
  }

  // --- Request phase -------------------------------------------------------
  const email = body.email?.trim().toLowerCase();
  if (email) {
    const user = await db.user.findUnique({ where: { email } });
    if (user) {
      const token = generateToken();
      await db.verificationToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          purpose: 'PASSWORD_RESET',
          expiresAt: new Date(Date.now() + 1000 * 60 * 60)
        }
      });
      await sendPasswordResetEmail(email, token);
    }
  }

  // Identical response whether or not the account exists.
  return json({ ok: true });
};
