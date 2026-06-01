<script lang="ts">
  /**
   * Root layout: global navigation, the persistent UnifiedMediaPlayer, and
   * the notification poller. The player lives here so playback survives client
   * navigations (it is never unmounted between routes).
   */
  import { onMount } from 'svelte';
  import { notifications } from '$lib/stores/notifications';
  import UnifiedMediaPlayer from '$lib/components/UnifiedMediaPlayer.svelte';
  import type { LayoutData } from './$types';

  export let data: LayoutData;

  const { unread } = notifications;

  onMount(() => {
    if (data.user) notifications.start();
    return () => notifications.stop();
  });

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    location.href = '/';
  }
</script>

<nav>
  <a class="brand" href="/">♫ Resonate</a>
  <div class="links">
    <a href="/explore">Explore</a>
    {#if data.user}
      <a href="/notifications" class="bell">
        Alerts{#if $unread > 0}<span class="badge">{$unread}</span>{/if}
      </a>
      <a href={`/u/${data.user.username}`}>Profile</a>
      <a href="/settings/connections">Connections</a>
      <button on:click={logout}>Log out</button>
    {:else}
      <a href="/auth/login">Log in</a>
      <a href="/auth/register">Sign up</a>
    {/if}
  </div>
</nav>

<main>
  <slot />
</main>

<!-- Persistent global player (renders only when a track is loaded). -->
<UnifiedMediaPlayer />

<style>
  :global(body) {
    margin: 0;
    font-family: system-ui, sans-serif;
    background: #fafafa;
    color: #111;
  }
  nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1.25rem;
    background: #fff;
    border-bottom: 1px solid #eee;
    position: sticky;
    top: 0;
    z-index: 40;
  }
  .brand {
    font-weight: 800;
    font-size: 1.25rem;
    text-decoration: none;
    color: #111;
  }
  .links {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .links a {
    text-decoration: none;
    color: #333;
  }
  .bell {
    position: relative;
  }
  .badge {
    background: #e0245e;
    color: #fff;
    border-radius: 999px;
    font-size: 0.7rem;
    padding: 0 0.4rem;
    margin-left: 0.25rem;
  }
  .links button {
    background: none;
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 0.3rem 0.7rem;
    cursor: pointer;
  }
  main {
    padding-bottom: 180px; /* space for the fixed player bar */
  }
</style>
