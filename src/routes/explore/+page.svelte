<script lang="ts">
  /**
   * Explore — desktop-first discovery page. A responsive artwork grid of public
   * posts (Instagram-explore style) with a trending-tags strip and, for signed
   * in viewers, who-to-follow suggestions. Clicking artwork plays via the
   * global player store.
   */
  import { player } from '$lib/stores/player';
  import SuggestedUsers from '$lib/components/rail/SuggestedUsers.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<svelte:head><title>Explore · Resonate</title></svelte:head>

<div class="explore">
  <header class="head">
    <h1>Explore</h1>
    {#if data.trending.length}
      <div class="tags">
        {#each data.trending as t}
          <a href={`/explore/tags/${t.tag}`}>#{t.tag}</a>
        {/each}
      </div>
    {/if}
  </header>

  {#if data.suggestions.length}
    <div class="suggest">
      <SuggestedUsers users={data.suggestions} />
    </div>
  {/if}

  {#if data.posts.length}
    <div class="grid">
      {#each data.posts as post (post.id)}
        <button class="tile" on:click={() => player.play(post.media)} title={post.media.title}>
          {#if post.media.artworkUrl}
            <img src={post.media.artworkUrl} alt={post.media.title} loading="lazy" />
          {:else}
            <div class="ph">♪</div>
          {/if}
          <div class="overlay">
            <strong>{post.media.title}</strong>
            {#if post.media.artist}<span>{post.media.artist}</span>{/if}
            <em>♥ {post.likeCount} · ↗ {post.shareCount}</em>
          </div>
        </button>
      {/each}
    </div>
  {:else}
    <p class="empty">Nothing to explore yet. Be the first to post some music.</p>
  {/if}
</div>

<style>
  .explore {
    max-width: 1100px;
    margin: 0 auto;
    padding: 1.5rem;
  }
  .head h1 {
    margin: 0 0 0.5rem;
  }
  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1.25rem;
  }
  .tags a {
    background: #fff;
    border: 1px solid #e7e7e7;
    border-radius: 999px;
    padding: 0.3rem 0.8rem;
    text-decoration: none;
    color: #1d6fb9;
    font-weight: 600;
    font-size: 0.9rem;
  }
  .suggest {
    max-width: 420px;
    margin-bottom: 1.5rem;
  }

  /* Desktop-first grid; columns reduce as the viewport narrows. */
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
  .overlay {
    position: absolute;
    inset: auto 0 0 0;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    padding: 0.6rem;
    text-align: left;
    color: #fff;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
    opacity: 0;
    transition: opacity 0.15s;
  }
  .tile:hover .overlay,
  .tile:focus-visible .overlay {
    opacity: 1;
  }
  .overlay strong {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .overlay span {
    font-size: 0.8rem;
    opacity: 0.85;
  }
  .overlay em {
    font-size: 0.75rem;
    opacity: 0.8;
    font-style: normal;
    margin-top: 0.15rem;
  }
  .empty {
    opacity: 0.6;
    text-align: center;
    margin-top: 3rem;
  }
</style>
