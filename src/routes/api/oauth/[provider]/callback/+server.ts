import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { decodeState, exchangeCode } from '$lib/server/oauth/proxy';
import { parseProviderSlug } from '$lib/server/oauth/providers';

/**
 * GET /api/oauth/[provider]/callback
 *
 * OAuth redirect target. Validates the signed `state` (CSRF + user binding),
 * then performs the server-to-server code exchange and stores ENCRYPTED tokens.
 * The browser never receives the provider tokens or the client secret.
 */
export const GET: RequestHandler = async (event) => {
  const provider = parseProviderSlug(event.params.provider);
  if (!provider) throw error(404, 'Unknown music provider.');

  const code = event.url.searchParams.get('code');
  const state = event.url.searchParams.get('state');
  const oauthError = event.url.searchParams.get('error');

  if (oauthError) throw redirect(302, `/settings/connections?error=${encodeURIComponent(oauthError)}`);
  if (!code || !state) throw error(400, 'Missing code or state.');

  const decoded = decodeState(state);
  if (!decoded || decoded.provider !== provider) {
    throw error(400, 'Invalid OAuth state.');
  }

  // Defence in depth: the state-bound user must match the active session.
  if (!event.locals.user || event.locals.user.id !== decoded.userId) {
    throw error(403, 'Session/state mismatch.');
  }

  await exchangeCode(decoded.userId, provider, code);

  throw redirect(302, '/settings/connections?linked=' + provider.toLowerCase());
};
