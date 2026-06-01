import type { LayoutServerLoad } from './$types';

/**
 * Root layout load — exposes the authenticated user (if any) to every page.
 * Only public-safe fields are forwarded (set in hooks.server.ts).
 */
export const load: LayoutServerLoad = async ({ locals }) => {
  return { user: locals.user };
};
