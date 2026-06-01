import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  parseSocialSlug,
  verifySocialState,
  resolveSocialIdentity,
  upsertSocialUser
} from '$lib/server/oauth/social';
import { createSession } from '$lib/server/session';

/**
 * Social login callback.
 *
 * Apple uses `response_mode=form_post`, so we accept both GET (Google) and POST
 * (Apple) and read the code/state from query or form body accordingly.
 */
async function handle(event: Parameters<RequestHandler>[0]): Promise<Response> {
  const provider = parseSocialSlug(event.params.provider);
  if (!provider) throw error(404, 'Unknown auth provider.');

  let code: string | null;
  let state: string | null;
  if (event.request.method === 'POST') {
    const form = await event.request.formData();
    code = form.get('code')?.toString() ?? null;
    state = form.get('state')?.toString() ?? null;
  } else {
    code = event.url.searchParams.get('code');
    state = event.url.searchParams.get('state');
  }

  if (!verifySocialState(state)) throw error(400, 'Invalid OAuth state.');
  if (!code) throw error(400, 'Missing authorization code.');

  const identity = await resolveSocialIdentity(provider, code);
  if (!identity.providerUserId) throw error(400, 'Could not resolve identity.');

  const userId = await upsertSocialUser(provider, identity);
  await createSession(userId, event.cookies, {
    userAgent: event.request.headers.get('user-agent') ?? undefined,
    ipAddress: event.getClientAddress()
  });

  throw redirect(303, '/');
}

export const GET: RequestHandler = (event) => handle(event);
export const POST: RequestHandler = (event) => handle(event);
