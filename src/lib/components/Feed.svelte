<script lang="ts">
  /**
   * The Instagram-style activity feed. Backed by the `feed` store (Svelte
   * stores), with infinite scroll via an IntersectionObserver sentinel.
   */
  import { onMount } from 'svelte';
  import { feed } from '$lib/stores/feed';
  import FeedPost from './FeedPost.svelte';
  import type { PostDTO } from '$lib/types';

  /** Optional SSR-provided initial posts to avoid a blank first paint. */
  export let initial: PostDTO[] = [];

  const { posts, loading, done } = feed;

  let sentinel: HTMLElement;

  onMount(() => {
    if (initial.length) posts.set(initial);
    else feed.load(true);

    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !$loading && !$done) feed.load();
    });
    if (sentinel) io.observe(sentinel);
    return () => io.disconnect();
  });
</script>

<div class="feed">
  {#each $posts as post (post.id)}
    <FeedPost {post} />
  {/each}

  {#if $loading}<p class="status">Loading…</p>{/if}
  {#if $done && $posts.length === 0}<p class="status">No posts yet. Follow people to see their music.</p>{/if}

  <div bind:this={sentinel} class="sentinel" aria-hidden="true"></div>
</div>

<style>
  .feed {
    max-width: 600px;
    margin: 0 auto;
    padding: 0 0 1rem;
  }
  .status {
    text-align: center;
    opacity: 0.6;
  }
  .sentinel {
    height: 1px;
  }
</style>
