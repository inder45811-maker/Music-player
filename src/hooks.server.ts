import type { Handle, HandleServerError } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { env as publicEnv } from '$env/dynamic/public';
import { SESSION_COOKIE, validateSession } from '$lib/server/session';

const PUBLIC_APP_ORIGIN = publicEnv.PUBLIC_APP_ORIGIN ?? '';

/**
 * Server hooks pipeline.
 *
 *   1. authenticate  — resolve the session cookie into `locals.user`.
 *   2. csrfGuard     — reject state-changing cross-origin requests.
 *   3. securityHeaders — apply hardened response headers (CSP, etc.).
 *
 * SvelteKit already provides built-in CSRF origin checking for form posts
 * (configured in svelte.config.js). `csrfGuard` extends that to JSON/`fetch`
 * API calls, which are the primary attack surface for our endpoints.
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// --- 1. Session authentication --------------------------------------------
const authenticate: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get(SESSION_COOKIE);
  const session = await validateSession(token);

  if (session) {
    event.locals.user = {
      id: session.user.id,
      email: session.user.email,
      username: session.user.username,
      displayName: session.user.displayName,
      avatarUrl: session.user.avatarUrl,
      emailVerifiedAt: session.user.emailVerifiedAt
    };
    event.locals.sessionToken = token ?? null;
  } else {
    event.locals.user = null;
    event.locals.sessionToken = null;
  }

  return resolve(event);
};

// --- 2. CSRF guard for non-form (JSON) mutations --------------------------
const csrfGuard: Handle = async ({ event, resolve }) => {
  const { request } = event;

  if (!SAFE_METHODS.has(request.method)) {
    const origin = request.headers.get('origin');
    // Same-origin requests from our own app must carry a matching Origin.
    // Missing Origin on a same-site fetch is rejected for mutations.
    const allowed = origin === PUBLIC_APP_ORIGIN || origin === event.url.origin;
    if (!allowed) {
      return new Response('Cross-origin request blocked', { status: 403 });
    }
  }

  return resolve(event);
};

// --- 3. Hardened security headers -----------------------------------------
const securityHeaders: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);

  // Content Security Policy. The external player SDKs require explicit allow
  // listing of their script/frame origins (Spotify, SoundCloud, YouTube, Apple).
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://sdk.scdn.co https://w.soundcloud.com https://www.youtube.com https://js-cdn.music.apple.com",
      "frame-src https://w.soundcloud.com https://www.youtube.com https://sdk.scdn.co https://embed.music.apple.com",
      "img-src 'self' data: https:",
      "media-src 'self' https: blob:",
      "connect-src 'self' https://api.spotify.com https://api.soundcloud.com https://www.googleapis.com https://api.music.apple.com",
      "style-src 'self' 'unsafe-inline'",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'self'"
    ].join('; ')
  );
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );

  return response;
};

export const handle = sequence(authenticate, csrfGuard, securityHeaders);

/** Avoid leaking internal error details to clients. */
export const handleError: HandleServerError = ({ error, event }) => {
  const id = crypto.randomUUID();
  console.error(`[${id}] ${event.request.method} ${event.url.pathname}`, error);
  return { message: 'An unexpected error occurred.', id };
};
