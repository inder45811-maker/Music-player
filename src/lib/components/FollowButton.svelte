<script lang="ts">
  /**
   * Follow / Unfollow toggle. Optimistically flips state and calls the API.
   * `pending` reflects a private-account follow request awaiting approval.
   */
  export let targetUserId: string;
  export let following = false;
  export let pending = false;

  let busy = false;

  async function toggle() {
    if (busy) return;
    busy = true;
    const wasFollowing = following || pending;
    try {
      const res = await fetch('/api/follows', {
        method: wasFollowing ? 'DELETE' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ targetUserId })
      });
      if (!res.ok) return;
      if (wasFollowing) {
        following = false;
        pending = false;
      } else {
        const data = (await res.json()) as { pending: boolean };
        pending = data.pending;
        following = !data.pending;
      }
    } finally {
      busy = false;
    }
  }
</script>

<button class:following on:click={toggle} disabled={busy}>
  {#if pending}Requested{:else if following}Following{:else}Follow{/if}
</button>

<style>
  button {
    padding: 0.4rem 1rem;
    border-radius: 999px;
    border: 1px solid #1db954;
    background: #1db954;
    color: #fff;
    cursor: pointer;
    font-weight: 600;
  }
  button.following {
    background: transparent;
    color: #1db954;
  }
  button:disabled {
    opacity: 0.6;
    cursor: default;
  }
</style>
