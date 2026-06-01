<script lang="ts">
  /** Right-rail widget: who-to-follow suggestions with inline follow buttons. */
  import FollowButton from '../FollowButton.svelte';
  import type { AuthorDTO } from '$lib/types';
  export let users: AuthorDTO[] = [];
</script>

<section class="card">
  <h2>Who to follow</h2>
  {#if users.length}
    <ul>
      {#each users as u (u.id)}
        <li>
          <a class="who" href={`/u/${u.username}`}>
            {#if u.avatarUrl}<img src={u.avatarUrl} alt="" />{:else}<span class="ph">{u.username[0]}</span>{/if}
            <span class="names">
              <strong>{u.displayName ?? u.username}</strong>
              <span class="handle">@{u.username}</span>
            </span>
          </a>
          <FollowButton targetUserId={u.id} />
        </li>
      {/each}
    </ul>
  {:else}
    <p class="empty">No suggestions right now.</p>
  {/if}
</section>

<style>
  .card {
    background: #fff;
    border: 1px solid #eee;
    border-radius: 14px;
    padding: 1rem 1.1rem;
  }
  h2 {
    font-size: 1rem;
    margin: 0 0 0.6rem;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }
  .who {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    text-decoration: none;
    color: inherit;
    min-width: 0;
  }
  .who img,
  .who .ph {
    width: 38px;
    height: 38px;
    border-radius: 999px;
    object-fit: cover;
    flex-shrink: 0;
  }
  .who .ph {
    display: grid;
    place-items: center;
    background: #eee;
    text-transform: uppercase;
    font-weight: 700;
  }
  .names {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .names strong {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .handle {
    font-size: 0.78rem;
    opacity: 0.6;
  }
  .empty {
    opacity: 0.6;
    font-size: 0.9rem;
  }
</style>
