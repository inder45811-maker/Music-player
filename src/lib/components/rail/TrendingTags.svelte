<script lang="ts">
  /** Right-rail widget: trending hashtags by post volume. */
  import type { TrendingTag } from '$lib/server/discovery';
  export let tags: TrendingTag[] = [];
</script>

<section class="card">
  <h2>Trending</h2>
  {#if tags.length}
    <ul>
      {#each tags as t}
        <li>
          <a href={`/explore/tags/${t.tag}`}>#{t.tag}</a>
          <span class="count">{t.postCount} posts</span>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="empty">No trends yet.</p>
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
    gap: 0.55rem;
  }
  li {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  a {
    color: #1d6fb9;
    text-decoration: none;
    font-weight: 600;
  }
  .count {
    font-size: 0.75rem;
    opacity: 0.55;
  }
  .empty {
    opacity: 0.6;
    font-size: 0.9rem;
  }
</style>
