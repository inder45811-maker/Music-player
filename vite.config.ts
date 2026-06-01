import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  // Server-only secrets must never be exposed to the client bundle. Vite only
  // exposes variables prefixed with `PUBLIC_` (see `$env/static/public`); all
  // other variables are accessed through `$env/static/private` and stay on the
  // server. We keep the default `envPrefix` of `PUBLIC_` to enforce this.
  envPrefix: 'PUBLIC_'
});
