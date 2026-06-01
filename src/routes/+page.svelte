<script lang="ts">
  import Feed from '$lib/components/Feed.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<svelte:head>
  <title>Home · Resonate</title>
</svelte:head>

<Feed initial={data.posts} />
