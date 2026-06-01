<script lang="ts">
  /**
   * Root layout — a desktop-first application shell.
   *
   * On desktop the chrome is a persistent left sidebar (navigation + account)
   * alongside a wide content region, with the global player docked full-width
   * along the bottom (Spotify-style). The layout then collapses responsively:
   * below the `--bp` breakpoint the sidebar becomes a compact sticky top bar so
   * the same markup works on phones.
   *
   * The UnifiedMediaPlayer lives here so playback survives client navigations.
   */
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
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

  // Highlight the active nav item.
  $: path = $page.url.pathname;
  const isActive = (href: string) => path === href || (href !== '/' && path.startsWith(href));
</script>

<div class="shell">
  <aside class="sidebar">
    <a class="brand" href="/">♫ Resonate</a>

    <nav class="nav">
      <a href="/" class:active={isActive('/')}>🏠 <span>Home</span></a>
      <a href="/explore" class:active={isActive('/explore')}>🔍 <span>Explore</span></a>
      {#if data.user}
        <a href="/notifications" class:active={isActive('/notifications')}>
          🔔 <span>Alerts</span>
          {#if $unread > 0}<span class="badge">{$unread}</span>{/if}
        </a>
        <a href={`/u/${data.user.username}`} class:active={isActive(`/u/${data.user.username}`)}>
          👤 <span>Profile</span>
        </a>
        <a href="/settings/connections" class:active={isActive('/settings/connections')}>
          🎵 <span>Connections</span>
        </a>
      {/if}
    </nav>

    <div class="account">
      {#if data.user}
        <a class="me" href={`/u/${data.user.username}`}>
          {#if data.user.avatarUrl}<img src={data.user.avatarUrl} alt="" />{/if}
          <span class="handle">@{data.user.username}</span>
        </a>
        <button on:click={logout}>Log out</button>
      {:else}
        <a class="btn ghost" href="/auth/login">Log in</a>
        <a class="btn solid" href="/auth/register">Sign up</a>
      {/if}
    </div>
  </aside>

  <main>
    <slot />
  </main>
</div>

<!-- Persistent global player (renders only when a track is loaded). -->
<UnifiedMediaPlayer />

<style>
  :global(:root) {
    --bp: 860px; /* sidebar -> top-bar breakpoint */
    --sidebar-w: 248px;
    --player-h: 168px;
    --accent: #1db954;
  }
  :global(body) {
    margin: 0;
    font-family: system-ui, -apple-system, sans-serif;
    background: #fafafa;
    color: #111;
  }

  /* ---- Desktop-first shell: fixed left rail + fluid content ---- */
  .shell {
    display: grid;
    grid-template-columns: var(--sidebar-w) 1fr;
    min-height: 100vh;
  }

  .sidebar {
    position: sticky;
    top: 0;
    align-self: start;
    height: 100vh;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 1.25rem 1rem;
    background: #fff;
    border-right: 1px solid #eee;
    box-sizing: border-box;
  }
  .brand {
    font-weight: 800;
    font-size: 1.4rem;
    text-decoration: none;
    color: #111;
  }
  .nav {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .nav a {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0.75rem;
    border-radius: 10px;
    text-decoration: none;
    color: #333;
    font-weight: 600;
  }
  .nav a:hover {
    background: #f3f3f3;
  }
  .nav a.active {
    background: #eafaf0;
    color: var(--accent);
  }
  .badge {
    margin-left: auto;
    background: #e0245e;
    color: #fff;
    border-radius: 999px;
    font-size: 0.7rem;
    padding: 0 0.45rem;
  }
  .account {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .me {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
    color: #111;
    font-weight: 600;
  }
  .me img {
    width: 32px;
    height: 32px;
    border-radius: 999px;
    object-fit: cover;
  }
  .account button,
  .btn {
    text-align: center;
    border-radius: 8px;
    padding: 0.5rem 0.8rem;
    cursor: pointer;
    text-decoration: none;
    font: inherit;
  }
  .account button {
    background: none;
    border: 1px solid #ddd;
    color: #333;
  }
  .btn.solid {
    background: var(--accent);
    color: #fff;
    border: none;
  }
  .btn.ghost {
    border: 1px solid #ddd;
    color: #333;
  }

  main {
    min-width: 0; /* allow content to shrink inside the grid track */
    padding-bottom: var(--player-h);
  }

  /* ---- Responsive collapse: rail becomes a sticky top bar on phones ---- */
  @media (max-width: 860px) {
    .shell {
      grid-template-columns: 1fr;
    }
    .sidebar {
      position: sticky;
      top: 0;
      height: auto;
      flex-direction: row;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 0.9rem;
      border-right: none;
      border-bottom: 1px solid #eee;
      z-index: 40;
      overflow-x: auto;
    }
    .brand {
      font-size: 1.2rem;
    }
    .nav {
      flex-direction: row;
      gap: 0.15rem;
      margin-left: 0.5rem;
    }
    .nav a span {
      display: none; /* icon-only nav on small screens */
    }
    .badge {
      margin-left: 0;
    }
    .account {
      margin-top: 0;
      margin-left: auto;
      flex-direction: row;
      align-items: center;
    }
    .me .handle {
      display: none;
    }
  }
</style>
