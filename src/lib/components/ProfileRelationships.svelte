<script lang="ts">
  /**
   * Profile relationship manager.
   *
   * Public view: shows follower/following COUNTS and public lists.
   * Owner view (`isOwner`): adds management controls — accept/reject pending
   * follow requests, forcibly remove followers, and block users. These
   * privileged actions are gated server-side; this UI only surfaces them to
   * the authenticated owner.
   */
  import FollowButton from './FollowButton.svelte';
  import type { AuthorDTO } from '$lib/types';

  export let isOwner = false;
  export let followerCount = 0;
  export let followingCount = 0;
  export let followers: AuthorDTO[] = [];
  export let following: AuthorDTO[] = [];
  export let pendingRequests: AuthorDTO[] = [];

  let tab: 'followers' | 'following' = 'followers';

  async function removeFollower(userId: string) {
    const res = await fetch('/api/follows', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ removeFollowerId: userId })
    });
    if (res.ok) followers = followers.filter((f) => f.id !== userId);
  }

  async function respondRequest(followerId: string, accept: boolean) {
    const res = await fetch('/api/follows', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ followerId, accept })
    });
    if (res.ok) {
      pendingRequests = pendingRequests.filter((r) => r.id !== followerId);
      if (accept) followerCount += 1;
    }
  }

  async function block(userId: string) {
    const res = await fetch('/api/blocks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ targetUserId: userId })
    });
    if (res.ok) {
      followers = followers.filter((f) => f.id !== userId);
      following = following.filter((f) => f.id !== userId);
    }
  }
</script>

<section class="relationships">
  <div class="counts">
    <button class:active={tab === 'followers'} on:click={() => (tab = 'followers')}>
      <strong>{followerCount}</strong> followers
    </button>
    <button class:active={tab === 'following'} on:click={() => (tab = 'following')}>
      <strong>{followingCount}</strong> following
    </button>
  </div>

  {#if isOwner && pendingRequests.length}
    <div class="requests">
      <h3>Follow requests</h3>
      {#each pendingRequests as r (r.id)}
        <div class="row">
          <span>{r.displayName ?? r.username}</span>
          <div class="row-actions">
            <button on:click={() => respondRequest(r.id, true)}>Accept</button>
            <button on:click={() => respondRequest(r.id, false)}>Decline</button>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <ul class="list">
    {#if tab === 'followers'}
      {#each followers as u (u.id)}
        <li class="row">
          <a href={`/u/${u.username}`}>{u.displayName ?? u.username}</a>
          {#if isOwner}
            <div class="row-actions">
              <button on:click={() => removeFollower(u.id)}>Remove</button>
              <button class="danger" on:click={() => block(u.id)}>Block</button>
            </div>
          {/if}
        </li>
      {/each}
    {:else}
      {#each following as u (u.id)}
        <li class="row">
          <a href={`/u/${u.username}`}>{u.displayName ?? u.username}</a>
          {#if isOwner}<FollowButton targetUserId={u.id} following={true} />{/if}
        </li>
      {/each}
    {/if}
  </ul>
</section>

<style>
  .counts {
    display: flex;
    gap: 1rem;
  }
  .counts button {
    background: none;
    border: none;
    cursor: pointer;
    opacity: 0.6;
  }
  .counts button.active {
    opacity: 1;
    border-bottom: 2px solid #1db954;
  }
  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid #f0f0f0;
  }
  .row-actions {
    display: flex;
    gap: 0.5rem;
  }
  .row-actions button {
    border: 1px solid #ddd;
    background: #fafafa;
    border-radius: 6px;
    padding: 0.25rem 0.6rem;
    cursor: pointer;
  }
  .danger {
    color: #c0264b;
    border-color: #f3c0cd;
  }
  .list {
    list-style: none;
    padding: 0;
  }
</style>
