<script lang="ts">
  /**
   * Profile — desktop-first layout: a wide banner header (avatar, identity,
   * counts, actions) over a two-column body — the post grid beside a sticky
   * relationships panel. Collapses to a single column on phones.
   */
  import FollowButton from '$lib/components/FollowButton.svelte';
  import ProfileRelationships from '$lib/components/ProfileRelationships.svelte';
  import { player } from '$lib/stores/player';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<svelte:head><title>{data.profile.displayName ?? data.profile.username} · Resonate</title></svelte:head>

<div class="profile">
  <header class="banner">
    {#if data.profile.avatarUrl}
      <img class="avatar" src={data.profile.avatarUrl} alt="" />
    {:else}
      <div class="avatar ph">{data.profile.username[0]}</div>
    {/if}

    <div class="identity">
      <div class="top">
        <h1>{data.profile.displayName ?? data.profile.username}</h1>
        {#if !data.isOwner}
          <FollowButton
            targetUserId={data.profile.id}
            following={data.viewerFollows}
            pending={data.viewerPending}
          />
        {:else}
          <a class="edit" href="/settings/connections">Connections</a>
        {/if}
      </div>
      <span class="handle">@{data.profile.username}</span>

      <div class="stats">
        <span><strong>{data.posts.length}</strong> posts</span>
        <span><strong>{data.followerCount}</strong> followers</span>
        <span><strong>{data.followingCount}</strong> following</span>
      </div>

      {#if data.profile.bio}<p class="bio">{data.profile.bio}</p>{/if}
    </div>
  </header>

  {#if data.canSeeProfile}
    <div class="body">
      <section class="posts">
        {#if data.posts.length}
          <div class="grid">
            {#each data.posts as post (post.id)}
              <button class="tile" on:click={() => player.play(post.media)} title={post.media.title}>
                {#if post.media.artworkUrl}
                  <img src={post.media.artworkUrl} alt={post.media.title} loading="lazy" />
                {:else}
                  <div class="tph">♪</div>
                {/if}
                <span class="meta">♥ {post.likeCount}</span>
              </button>
            {/each}
          </div>
        {:else}
          <p class="empty">No posts yet.</p>
        {/if}
      </section>

      <aside class="rel">
        <ProfileRelationships
          isOwner={data.isOwner}
          followerCount={data.followerCount}
          followingCount={data.followingCount}
          followers={data.followers}
          following={data.following}
          pendingRequests={data.pendingRequests}
        />
      </aside>
    </div>
  {:else}
    <p class="private">🔒 This account is private. Follow to see their music.</p>
  {/if}
</div>

<style>
  .profile {
    max-width: 1000px;
    margin: 0 auto;
    padding: 1.5rem;
  }
  .banner {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid #eee;
  }
  .avatar {
    width: 120px;
    height: 120px;
    border-radius: 999px;
    object-fit: cover;
    flex-shrink: 0;
  }
  .avatar.ph {
    display: grid;
    place-items: center;
    background: #eee;
    font-size: 3rem;
    font-weight: 700;
    text-transform: uppercase;
  }
  .identity {
    flex: 1;
    min-width: 0;
  }
  .top {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .top h1 {
    margin: 0;
  }
  .edit {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 0.35rem 0.9rem;
    text-decoration: none;
    color: #333;
  }
  .handle {
    opacity: 0.6;
  }
  .stats {
    display: flex;
    gap: 1.5rem;
    margin: 0.75rem 0;
  }
  .bio {
    margin: 0;
  }

  .body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 2rem;
    align-items: start;
    margin-top: 1.5rem;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }
  .tile {
    position: relative;
    aspect-ratio: 1 / 1;
    border: 0;
    padding: 0;
    border-radius: 10px;
    overflow: hidden;
    cursor: pointer;
    background: #111;
  }
  .tile img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .tph {
    display: grid;
    place-items: center;
    height: 100%;
    color: #555;
    font-size: 2rem;
  }
  .tile .meta {
    position: absolute;
    bottom: 0.4rem;
    left: 0.5rem;
    color: #fff;
    font-size: 0.8rem;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
    opacity: 0;
    transition: opacity 0.15s;
  }
  .tile:hover .meta {
    opacity: 1;
  }
  .rel {
    position: sticky;
    top: 1.5rem;
    background: #fff;
    border: 1px solid #eee;
    border-radius: 14px;
    padding: 1rem;
  }
  .private,
  .empty {
    text-align: center;
    opacity: 0.7;
    margin-top: 2rem;
  }

  @media (max-width: 900px) {
    .banner {
      flex-direction: column;
      text-align: center;
    }
    .top {
      justify-content: center;
    }
    .stats {
      justify-content: center;
    }
    .body {
      grid-template-columns: 1fr;
    }
    .rel {
      position: static;
    }
  }
</style>
