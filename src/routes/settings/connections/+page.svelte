<script lang="ts">
  /**
   * Music account federation UI. Each "Connect" link navigates to the backend
   * OAuth proxy start route; the client secret is never involved client-side.
   */
  import type { PageData } from './$types';
  import type { MusicProvider } from '$lib/types';

  export let data: PageData;

  const providers: { key: MusicProvider; slug: string; label: string }[] = [
    { key: 'SPOTIFY', slug: 'spotify', label: 'Spotify' },
    { key: 'SOUNDCLOUD', slug: 'soundcloud', label: 'SoundCloud' },
    { key: 'YOUTUBE', slug: 'youtube', label: 'YouTube' },
    { key: 'APPLE_MUSIC', slug: 'apple_music', label: 'Apple Music' }
  ];

  const linkedSet = new Set(data.linked.map((l) => l.provider));
</script>

<svelte:head><title>Connections · Resonate</title></svelte:head>

<div class="connections">
  <h1>Linked music accounts</h1>
  <p class="hint">
    Link your premium accounts to play full tracks and post from your libraries.
    Tokens are encrypted on our servers — your credentials never touch the browser.
  </p>

  <ul>
    {#each providers as p}
      <li>
        <span class="name">{p.label}</span>
        {#if linkedSet.has(p.key)}
          <span class="status linked">Connected</span>
        {:else}
          <a class="connect" href={`/api/oauth/${p.slug}/start`} data-sveltekit-reload>Connect</a>
        {/if}
      </li>
    {/each}
  </ul>
</div>

<style>
  .connections {
    max-width: 520px;
    margin: 2rem auto;
    padding: 1rem;
  }
  .hint {
    opacity: 0.7;
    font-size: 0.9rem;
  }
  ul {
    list-style: none;
    padding: 0;
  }
  li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.9rem 0;
    border-bottom: 1px solid #eee;
  }
  .name {
    font-weight: 600;
  }
  .status.linked {
    color: #1db954;
    font-weight: 600;
  }
  .connect {
    padding: 0.4rem 1rem;
    border-radius: 999px;
    background: #111;
    color: #fff;
    text-decoration: none;
  }
</style>
