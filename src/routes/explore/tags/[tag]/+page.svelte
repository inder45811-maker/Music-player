<script lang="ts">
  /** Hashtag page — desktop-first artwork grid of posts for one tag. */
  import { player } from '$lib/stores/player';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<svelte:head><title>#{data.tag} · Resonate</title></svelte:head>

<div class="tagpage">
  <header>
    <h1>#{data.tag}</h1>
    <span class="count">{data.posts.length} posts</span>
  </header>

  {#if data.posts.length}
    <div class="grid">
      {#each data.posts as post (post.id)}
        <button class="tile" on:click={() => player.play(post.media)} title={post.media.title}>
          {#if post.media.artworkUrl}
            <img src={post.media.artworkUrl} alt={post.media.title} loading="lazy" />
          {:else}
            <div class="ph">♪</div>
          {/if}
        </button>
      {/each}
    </div>
  {:else}
    <p class="empty">No posts with this tag yet.</p>
  {/if}
</div>

<style>
  .tagpage {
    max-width: 1100px;
    margin: 0 auto;
    padding: 1.5rem;
  }
  header {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }
  header h1 {
    margin: 0;
  }
  .count {
    opacity: 0.6;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.75rem;
  }
  @media (max-width: 980px) {
    .grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  @media (max-width: 640px) {
    .grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  .tile {
    position: relative;
    aspect-ratio: 1 / 1;
    border: 0;
    padding: 0;
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    background: #111;
  }
  .tile img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .tile .ph {
    display: grid;
    place-items: center;
    height: 100%;
    font-size: 3rem;
    color: #555;
  }
  .empty {
    opacity: 0.6;
    text-align: center;
    margin-top: 3rem;
  }
</style>
