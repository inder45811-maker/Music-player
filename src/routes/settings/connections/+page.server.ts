import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

/**
 * Connections settings. Lists which music providers the user has linked. Note
 * that we NEVER expose tokens — only the provider, link time and scope.
 */
export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(302, '/auth/login');

  const accounts = await db.musicAccount.findMany({
    where: { userId: locals.user.id },
    select: { provider: true, scope: true, createdAt: true, tokenExpiresAt: true }
  });

  return {
    linked: accounts.map((a) => ({
      provider: a.provider,
      scope: a.scope,
      linkedAt: a.createdAt.toISOString(),
      expiresAt: a.tokenExpiresAt?.toISOString() ?? null
    }))
  };
};
