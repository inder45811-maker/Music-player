// See https://kit.svelte.dev/docs/types#app for reference.
import type { User } from '@prisma/client';

declare global {
  namespace App {
    interface Locals {
      /** The authenticated user, or null for anonymous requests. */
      user: Pick<
        User,
        'id' | 'email' | 'username' | 'displayName' | 'avatarUrl' | 'emailVerifiedAt'
      > | null;
      /** Raw session token (server-side use only). */
      sessionToken: string | null;
    }

    interface PageData {
      user: App.Locals['user'];
    }

    // interface Error {}
    // interface Platform {}
  }
}

export {};
