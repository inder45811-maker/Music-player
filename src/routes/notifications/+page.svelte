<script lang="ts">
  /** Notification center. Reads from the polling-backed notifications store. */
  import { onMount } from 'svelte';
  import { notifications } from '$lib/stores/notifications';
  import type { NotificationDTO } from '$lib/types';

  const { items } = notifications;

  onMount(() => {
    notifications.poll();
  });

  function label(n: NotificationDTO): string {
    const who = n.actor?.displayName ?? n.actor?.username ?? 'Someone';
    switch (n.type) {
      case 'NEW_FOLLOWER':
        return `${who} started following you`;
      case 'FOLLOW_REQUEST':
        return `${who} requested to follow you`;
      case 'POST_LIKE':
        return `${who} liked your post`;
      case 'POST_SHARE':
        return `${who} shared your post`;
      case 'HASHTAG_MENTION':
        return `${who} mentioned you`;
      default:
        return 'New activity';
    }
  }
</script>

<svelte:head><title>Notifications · Resonate</title></svelte:head>

<div class="notifications">
  <header>
    <h1>Notifications</h1>
    <button on:click={() => notifications.markAllRead()}>Mark all read</button>
  </header>

  <ul>
    {#each $items as n (n.id)}
      <li class:unread={!n.read}>
        {#if n.actor?.avatarUrl}<img src={n.actor.avatarUrl} alt="" />{/if}
        <span>{label(n)}</span>
        <time>{new Date(n.createdAt).toLocaleString()}</time>
      </li>
    {/each}
    {#if $items.length === 0}<li class="empty">You're all caught up.</li>{/if}
  </ul>
</div>

<style>
  .notifications {
    max-width: 520px;
    margin: 1.5rem auto;
    padding: 0 1rem;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  header button {
    border: 1px solid #ddd;
    background: #fff;
    border-radius: 6px;
    padding: 0.3rem 0.7rem;
    cursor: pointer;
  }
  ul {
    list-style: none;
    padding: 0;
  }
  li {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 0.5rem;
    border-bottom: 1px solid #f0f0f0;
  }
  li.unread {
    background: #f3fbf6;
  }
  li img {
    width: 32px;
    height: 32px;
    border-radius: 999px;
  }
  time {
    margin-left: auto;
    font-size: 0.75rem;
    opacity: 0.5;
  }
  .empty {
    opacity: 0.6;
    justify-content: center;
  }
</style>
