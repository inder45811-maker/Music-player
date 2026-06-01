<script lang="ts">
  /**
   * A single Instagram-style feed card. Visually prioritises the music artwork /
   * video thumbnail, then caption, hashtags and the like/share actions.
   *
   * - Clicking the artwork requests playback via the global player store.
   * - Likes toggle through the feed store (optimistic).
   * - Shares open the share sheet and record a granular share event.
   */
  import { player } from '$lib/stores/player';
  import { feed } from '$lib/stores/feed';
  import type { PostDTO, ShareDestination } from '$lib/types';

  export let post: PostDTO;

  let showShare = false;

  function play() {
    player.play(post.media);
  }

  async function share(destination: ShareDestination) {
    showShare = false;
    const res = await fetch(`/api/posts/${post.id}/share`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ destination, surface: 'feed' })
    });
    if (res.ok) {
      const { shareCount } = (await res.json()) as { shareCount: number };
      post.shareCount = shareCount;
    }
  }

  const destinations: { key: ShareDestination; label: string }[] = [
    { key: 'COPY_LINK', label: 'Copy link' },
    { key: 'INTERNAL_FEED', label: 'Repost to feed' },
    { key: 'DIRECT_MESSAGE', label: 'Direct message' },
    { key: 'TWITTER', label: 'Twitter / X' },
    { key: 'WHATSAPP', label: 'WhatsApp' }
  ];
</script>

<article class="post">
  <header>
    <a class="author" href={`/u/${post.author.username}`}>
      {#if post.author.avatarUrl}
        <img class="avatar" src={post.author.avatarUrl} alt="" />
      {/if}
      <span>{post.author.displayName ?? post.author.username}</span>
    </a>
    <span class="provider">{post.media.provider}</span>
  </header>

  <button class="artwork" on:click={play} aria-label={`Play ${post.media.title}`}>
    {#if post.media.artworkUrl}
      <img src={post.media.artworkUrl} alt={post.media.title} />
    {:else}
      <div class="placeholder">♪</div>
    {/if}
    <span class="play-badge">►</span>
  </button>

  <div class="track">
    <strong>{post.media.title}</strong>
    {#if post.media.artist}<span class="artist">{post.media.artist}</span>{/if}
  </div>

  <div class="actions">
    <button class:liked={post.likedByMe} on:click={() => feed.toggleLike(post.id)}>
      {post.likedByMe ? '♥' : '♡'} {post.likeCount}
    </button>
    <button on:click={() => (showShare = !showShare)}>↗ {post.shareCount}</button>
  </div>

  {#if showShare}
    <div class="share-sheet" role="menu">
      {#each destinations as d}
        <button role="menuitem" on:click={() => share(d.key)}>{d.label}</button>
      {/each}
    </div>
  {/if}

  {#if post.caption}<p class="caption">{post.caption}</p>{/if}

  {#if post.hashtags.length}
    <p class="tags">
      {#each post.hashtags as tag}
        <a href={`/explore/tags/${tag}`}>#{tag}</a>
      {/each}
    </p>
  {/if}
</article>

<style>
  .post {
    background: #fff;
    border: 1px solid #eee;
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 1.5rem;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
  }
  .author {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
    color: inherit;
    font-weight: 600;
  }
  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 999px;
    object-fit: cover;
  }
  .provider {
    font-size: 0.7rem;
    opacity: 0.5;
  }
  .artwork {
    position: relative;
    display: block;
    width: 100%;
    aspect-ratio: 1 / 1;
    border: 0;
    padding: 0;
    cursor: pointer;
    background: #111;
  }
  .artwork img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .placeholder {
    display: grid;
    place-items: center;
    height: 100%;
    font-size: 4rem;
    color: #444;
  }
  .play-badge {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-size: 3rem;
    color: rgba(255, 255, 255, 0.9);
    opacity: 0;
    transition: opacity 0.15s;
  }
  .artwork:hover .play-badge {
    opacity: 1;
  }
  .track {
    display: flex;
    flex-direction: column;
    padding: 0.75rem 1rem 0;
  }
  .artist {
    font-size: 0.85rem;
    opacity: 0.7;
  }
  .actions {
    display: flex;
    gap: 0.75rem;
    padding: 0.5rem 1rem;
  }
  .actions button {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
  }
  .actions .liked {
    color: #e0245e;
  }
  .share-sheet {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0 1rem 0.5rem;
  }
  .share-sheet button {
    border: 1px solid #ddd;
    background: #fafafa;
    border-radius: 8px;
    padding: 0.3rem 0.6rem;
    cursor: pointer;
    font-size: 0.85rem;
  }
  .caption {
    padding: 0 1rem;
    margin: 0.25rem 0;
  }
  .tags {
    padding: 0 1rem 1rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .tags a {
    color: #1d6fb9;
    text-decoration: none;
  }
</style>
