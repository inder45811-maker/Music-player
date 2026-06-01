import { dev } from '$app/environment';
import { env as publicEnv } from '$env/dynamic/public';

const PUBLIC_APP_ORIGIN = publicEnv.PUBLIC_APP_ORIGIN ?? '';

/**
 * Transactional email sender.
 *
 * This is a thin, swappable abstraction. In development it logs the message to
 * the console so the verification/reset flows can be exercised without an SMTP
 * server. In production, wire this to your provider (SES, Postmark, Resend…).
 */
async function send(to: string, subject: string, body: string): Promise<void> {
  if (dev) {
    console.info(`\n--- EMAIL (dev) ---\nTo: ${to}\nSubject: ${subject}\n${body}\n-------------------\n`);
    return;
  }
  // TODO: integrate real SMTP/provider here using server-only env vars.
  throw new Error('Email transport not configured in production.');
}

export function sendVerificationEmail(to: string, token: string): Promise<void> {
  const link = `${PUBLIC_APP_ORIGIN}/auth/verify?token=${token}`;
  return send(
    to,
    'Verify your email',
    `Welcome! Please confirm your email by visiting:\n${link}\n\nThis link expires in 24 hours.`
  );
}

export function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const link = `${PUBLIC_APP_ORIGIN}/auth/reset?token=${token}`;
  return send(
    to,
    'Reset your password',
    `A password reset was requested. If this was you, visit:\n${link}\n\nThis link expires in 1 hour. If not, ignore this email.`
  );
}
