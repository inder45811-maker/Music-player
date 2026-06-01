import { writable, get } from 'svelte/store';
import type { PostDTO } from '$lib/types';

/**
 * Feed store with cursor pagination and optimistic like/share updates.
 *
 * The Instagram-style feed reads from this store; mutations (like/share) update
 * the store optimistically and reconcile with the server response.
 */
function createFeed() {
  const posts = writable<PostDTO[]>([]);
  const loading = writable(false);
  const done = writable(false);

  async function load(reset = false) {
    if (get(loading)) return;
    loading.set(true);
    try {
      const current = get(posts);
      const before = reset || current.length === 0 ? '' : current[current.length - 1].createdAt;
      const url = new URL('/api/posts', location.origin);
      if (before) url.searchParams.set('before', before);

      const res = await fetch(url, { headers: { accept: 'application/json' } });
      if (!res.ok) return;
      const data = (await res.json()) as { posts: PostDTO[] };

      if (reset) posts.set(data.posts);
      else posts.update((p) => [...p, ...data.posts]);

      if (data.posts.length === 0) done.set(true);
    } finally {
      loading.set(false);
    }
  }

  /** Optimistically toggle a like and call the API. */
  async function toggleLike(postId: string) {
    let wasLiked = false;
    posts.update((list) =>
      list.map((p) => {
        if (p.id !== postId) return p;
        wasLiked = p.likedByMe;
        return {
          ...p,
          likedByMe: !wasLiked,
          likeCount: p.likeCount + (wasLiked ? -1 : 1)
        };
      })
    );

    const res = await fetch(`/api/posts/${postId}/like`, {
      method: wasLiked ? 'DELETE' : 'POST'
    });

    if (res.ok) {
      const { likeCount } = (await res.json()) as { likeCount: number };
      posts.update((list) => list.map((p) => (p.id === postId ? { ...p, likeCount } : p)));
    } else {
      // Roll back on failure.
      posts.update((list) =>
        list.map((p) =>
          p.id === postId
            ? { ...p, likedByMe: wasLiked, likeCount: p.likeCount + (wasLiked ? 1 : -1) }
            : p
        )
      );
    }
  }

  /** Prepend a freshly-created post (after composing). */
  function prepend(post: PostDTO) {
    posts.update((list) => [post, ...list]);
  }

  return { posts, loading, done, load, toggleLike, prepend };
}

export const feed = createFeed();
