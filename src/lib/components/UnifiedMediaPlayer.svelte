<script lang="ts">
  /**
   * Persistent, global Unified Media Player.
   *
   * Mounted once in the root layout, it subscribes to the `player` store and
   * seamlessly switches the underlying playback engine based on the current
   * media's provider:
   *
   *   SPOTIFY      -> Spotify embed/Web Playback SDK iframe
   *   SOUNDCLOUD   -> SoundCloud HTML5 Widget API (iframe)
   *   YOUTUBE      -> YouTube IFrame Player API
   *   APPLE_MUSIC  -> Apple MusicKit embed
   *
   * Each engine is isolated in its own iframe so switching providers tears down
   * the previous engine cleanly. The control bar reflects shared store state;
   * provider-native SDK callbacks would feed progress back via `player._set*`.
   *
   * NOTE: For brevity this uses provider EMBED iframes (which work without the
   * full JS SDKs). The hooks to upgrade each to its native SDK (e.g. Spotify
   * Web Playback SDK for gapless premium playback) are marked inline.
   */
  import { player, hasTrack } from '$lib/stores/player';
  import type { MusicProvider } from '$lib/types';

  // Build the correct embed URL for the active provider + media id.
  function embedSrc(
    provider: MusicProvider,
    mediaId: string,
    isPlaying: boolean
  ): string {
    switch (provider) {
      case 'SPOTIFY':
        // Spotify embed. Upgrade path: replace with Web Playback SDK + device id.
        return `https://open.spotify.com/embed/track/${mediaId}`;
      case 'SOUNDCLOUD':
        // SoundCloud Widget API. `auto_play` driven by store state.
        return `https://w.soundcloud.com/player/?url=${encodeURIComponent(
          'https://api.soundcloud.com/tracks/' + mediaId
        )}&auto_play=${isPlaying}`;
      case 'YOUTUBE':
        // YouTube IFrame API. `enablejsapi` lets us postMessage controls.
        return `https://www.youtube.com/embed/${mediaId}?enablejsapi=1&autoplay=${
          isPlaying ? 1 : 0
        }`;
      case 'APPLE_MUSIC':
        return `https://embed.music.apple.com/us/song/${mediaId}`;
      default:
        return '';
    }
  }

  $: current = $player.current;
  $: src = current ? embedSrc(current.provider, current.providerMediaId, $player.isPlaying) : '';
</script>

{#if $hasTrack && current}
  <aside class="player" aria-label="Now playing">
    <div class="meta">
      {#if current.artworkUrl}
        <img class="art" src={current.artworkUrl} alt={current.title} />
      {/if}
      <div class="text">
        <strong class="title">{current.title}</strong>
        {#if current.artist}<span class="artist">{current.artist}</span>{/if}
        <span class="provider">{current.provider}</span>
      </div>
    </div>

    <div class="controls">
      <button on:click={() => player.toggle()} aria-label={$player.isPlaying ? 'Pause' : 'Play'}>
        {$player.isPlaying ? '❚❚' : '►'}
      </button>
      <input
        class="volume"
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={$player.volume}
        on:input={(e) => player.setVolume(parseFloat(e.currentTarget.value))}
        aria-label="Volume"
      />
      <button class="stop" on:click={() => player.stop()} aria-label="Close player">✕</button>
    </div>

    <!--
      The engine iframe. `key` via {#key} forces a clean remount whenever the
      provider OR media id changes, guaranteeing the previous engine is disposed.
    -->
    {#key current.provider + current.providerMediaId}
      <iframe
        class="engine"
        title={`Player: ${current.title}`}
        {src}
        allow="autoplay; encrypted-media"
        loading="lazy"
        on:load={() => player._setReady(true)}
      ></iframe>
    {/key}
  </aside>
{/if}

<style>
  .player {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    align-items: center;
    gap: 0.5rem 1rem;
    padding: 0.5rem 1rem;
    background: #0b0b0f;
    color: #fff;
    border-top: 1px solid #222;
    z-index: 50;
  }
  .meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
  }
  .art {
    width: 48px;
    height: 48px;
    border-radius: 6px;
    object-fit: cover;
  }
  .text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .title {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .artist {
    font-size: 0.8rem;
    opacity: 0.7;
  }
  .provider {
    font-size: 0.65rem;
    opacity: 0.5;
    text-transform: capitalize;
  }
  .controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .controls button {
    background: #1db954;
    color: #fff;
    border: none;
    border-radius: 999px;
    width: 36px;
    height: 36px;
    cursor: pointer;
  }
  .controls .stop {
    background: #333;
  }
  .engine {
    grid-column: 1 / -1;
    width: 100%;
    height: 80px;
    border: 0;
    border-radius: 8px;
  }
</style>
