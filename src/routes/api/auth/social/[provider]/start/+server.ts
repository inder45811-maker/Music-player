import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { parseSocialSlug, buildSocialAuthorizeUrl } from '$lib/server/oauth/social';

/**
 * GET /api/auth/social/[provider]/start
 * Begins the Sign-in-with-Google / Sign-in-with-Apple flow.
 */
export const GET: RequestHandler = async (event) => {
  const provider = parseSocialSlug(event.params.provider);
  if (!provider) throw error(404, 'Unknown auth provider.');
  throw redirect(302, buildSocialAuthorizeUrl(provider));
};
