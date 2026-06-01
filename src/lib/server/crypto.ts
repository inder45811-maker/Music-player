import {
  createHash,
  createHmac,
  randomBytes,
  createCipheriv,
  createDecipheriv,
  timingSafeEqual,
  scryptSync
} from 'node:crypto';
import { env } from '$env/dynamic/private';
import { building } from '$app/environment';

/**
 * Cryptographic helpers used across auth, sessions and the OAuth token vault.
 *
 * Security properties:
 *   * Opaque tokens are 256 bits of CSPRNG output, URL-safe encoded.
 *   * Only SHA-256 hashes of tokens are persisted (DB leak != live session).
 *   * Provider tokens are sealed with AES-256-GCM (authenticated encryption)
 *     under a key derived from SESSION_SECRET via scrypt.
 *
 * `SESSION_SECRET` is read at runtime (dynamic env). We enforce its presence
 * lazily — on first cryptographic use — rather than at module load, so that the
 * build/prerender analysis step does not require production secrets.
 */

const SESSION_SECRET = env.SESSION_SECRET ?? '';

// Fail loudly at runtime (never during `building`) if the secret is weak/missing.
if (!building && (!SESSION_SECRET || SESSION_SECRET.length < 16)) {
  throw new Error('SESSION_SECRET must be set to a strong random value (>= 16 chars).');
}

// Derive a stable 32-byte symmetric key from the configured secret. During the
// build step (no secret available) fall back to an ephemeral key that is never
// used to seal real data.
const ENC_KEY = scryptSync(SESSION_SECRET || 'build-time-placeholder', 'music-player-token-vault', 32);

/** Generate a cryptographically-random, URL-safe opaque token. */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Deterministic SHA-256 hash (hex) — used to index tokens without storing them. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Constant-time string comparison to avoid timing oracles. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * Seal a secret (e.g. a provider access/refresh token) with AES-256-GCM.
 * Output format: base64url(iv).base64url(authTag).base64url(ciphertext)
 */
export function seal(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', ENC_KEY, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64url'), tag.toString('base64url'), ct.toString('base64url')].join('.');
}

/** Reverse of {@link seal}. Throws if the ciphertext was tampered with. */
export function unseal(sealed: string): string {
  const [ivB64, tagB64, ctB64] = sealed.split('.');
  if (!ivB64 || !tagB64 || !ctB64) throw new Error('Malformed sealed token.');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    ENC_KEY,
    Buffer.from(ivB64, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ctB64, 'base64url')),
    decipher.final()
  ]).toString('utf8');
}

/**
 * Sign an arbitrary payload with HMAC-SHA256. Used for stateless OAuth `state`
 * values so the callback can verify integrity without server-side storage.
 */
export function sign(payload: string): string {
  return createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
}

/** Verify an HMAC signature produced by {@link sign}. */
export function verifySignature(payload: string, signature: string): boolean {
  return safeEqual(sign(payload), signature);
}
