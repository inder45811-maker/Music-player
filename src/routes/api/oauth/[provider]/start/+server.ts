import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireUser } from '$lib/server/guard';
import { buildAuthorizeUrl } from '$lib/server/oauth/proxy';
import { parseProviderSlug } from '$lib/server/oauth/providers';

/**
 * GET /api/oauth/[provider]/start
 *
 * Entry point for linking a premium music account. Requires authentication,
 * then redirects the user to the provider's authorize URL. The client secret
 * is never involved here — only the public client id + a signed `state`.
 */
export const GET: RequestHandler = async (event) => {
  const user = requireUser(event);
  const provider = parseProviderSlug(event.params.provider);
  if (!provider) throw error(404, 'Unknown music provider.');

  const url = buildAuthorizeUrl(user.id, provider);
  throw redirect(302, url);
};
