import { hash, verify } from '@node-rs/argon2';

/**
 * Password hashing using Argon2id — the OWASP-recommended algorithm.
 *
 * Parameters chosen per the OWASP Password Storage Cheat Sheet (memory-hard
 * configuration). Tune `memoryCost`/`timeCost` to your hardware budget.
 */
const ARGON2_OPTIONS = {
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  outputLen: 32,
  parallelism: 1
} as const;

/** Hash a plaintext password for storage. */
export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

/**
 * Verify a plaintext password against a stored hash. Argon2 verification is
 * inherently constant-time with respect to the stored hash.
 */
export function verifyPassword(storedHash: string, password: string): Promise<boolean> {
  return verify(storedHash, password, ARGON2_OPTIONS);
}

/**
 * Lightweight server-side password policy. Real deployments should also screen
 * against a breached-password list (e.g. HaveIBeenPwned k-anonymity API).
 */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 10) return 'Password must be at least 10 characters.';
  if (password.length > 256) return 'Password is too long.';
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must include upper, lower case letters and a number.';
  }
  return null;
}
