<script lang="ts">
  /**
   * Home — desktop-first two-column layout: the central activity feed plus a
   * sticky right rail (trending hashtags + who-to-follow). The rail is hidden
   * below the layout breakpoint so phones get a single feed column.
   */
  import Feed from '$lib/components/Feed.svelte';
  import TrendingTags from '$lib/components/rail/TrendingTags.svelte';
  import SuggestedUsers from '$lib/components/rail/SuggestedUsers.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<svelte:head>
  <title>Home · Resonate</title>
</svelte:head>

<div class="home">
  <section class="feed-col">
    <Feed initial={data.posts} />
  </section>

  <aside class="rail">
    <TrendingTags tags={data.trending} />
    <SuggestedUsers users={data.suggestions} />
  </aside>
</div>

<style>
  .home {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 2rem;
    max-width: 1100px;
    margin: 0 auto;
    padding: 1.5rem 1.5rem 0;
    align-items: start;
  }
  .feed-col {
    min-width: 0;
  }
  .rail {
    position: sticky;
    top: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  /* Collapse to a single column on smaller viewports. */
  @media (max-width: 980px) {
    .home {
      grid-template-columns: 1fr;
      max-width: 640px;
    }
    .rail {
      display: none;
    }
  }
</style>
