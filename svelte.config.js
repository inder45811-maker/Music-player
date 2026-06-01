import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 * SvelteKit configuration.
 *
 * - `adapter-node` is used so the app can be deployed as a standalone Node
 *   server (suitable for hosting the OAuth proxy and database-backed APIs).
 * - CSRF `checkOrigin` is enabled (the default) so that cross-origin form
 *   submissions are rejected by the framework. We additionally enforce our
 *   own checks in `hooks.server.ts` for non-form requests.
 *
 * @type {import('@sveltejs/kit').Config}
 */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    // SvelteKit enables CSRF origin checking for form submissions by default;
    // we additionally enforce origin checks for JSON mutations in hooks.server.ts.
    alias: {
      $lib: 'src/lib'
    }
  }
};

export default config;
