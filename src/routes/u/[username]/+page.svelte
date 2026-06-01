<script lang="ts">
  import FollowButton from '$lib/components/FollowButton.svelte';
  import ProfileRelationships from '$lib/components/ProfileRelationships.svelte';
  import FeedPost from '$lib/components/FeedPost.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<svelte:head><title>{data.profile.displayName ?? data.profile.username} · Resonate</title></svelte:head>

<div class="profile">
  <header>
    {#if data.profile.avatarUrl}
      <img class="avatar" src={data.profile.avatarUrl} alt="" />
    {/if}
    <div class="identity">
      <h1>{data.profile.displayName ?? data.profile.username}</h1>
      <span class="handle">@{data.profile.username}</span>
      {#if data.profile.bio}<p class="bio">{data.profile.bio}</p>{/if}
    </div>
    {#if !data.isOwner}
      <FollowButton
        targetUserId={data.profile.id}
        following={data.viewerFollows}
        pending={data.viewerPending}
      />
    {/if}
  </header>

  {#if data.canSeeProfile}
    <ProfileRelationships
      isOwner={data.isOwner}
      followerCount={data.followerCount}
      followingCount={data.followingCount}
      followers={data.followers}
      following={data.following}
      pendingRequests={data.pendingRequests}
    />

    <section class="posts">
      {#each data.posts as post (post.id)}
        <FeedPost {post} />
      {/each}
      {#if data.posts.length === 0}<p class="empty">No posts yet.</p>{/if}
    </section>
  {:else}
    <p class="private">🔒 This account is private. Follow to see their music.</p>
  {/if}
</div>

<style>
  .profile {
    max-width: 600px;
    margin: 0 auto;
    padding: 1.5rem 1rem;
  }
  header {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .avatar {
    width: 80px;
    height: 80px;
    border-radius: 999px;
    object-fit: cover;
  }
  .identity {
    flex: 1;
  }
  .handle {
    opacity: 0.6;
  }
  .bio {
    margin: 0.5rem 0 0;
  }
  .private {
    text-align: center;
    margin-top: 2rem;
    opacity: 0.7;
  }
  .empty {
    text-align: center;
    opacity: 0.6;
  }
</style>
