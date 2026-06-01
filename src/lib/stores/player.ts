import { writable, derived, get } from 'svelte/store';
import type { MediaEntity } from '$lib/types';

/**
 * Global player store.
 *
 * Holds the currently-loaded media entity and transport state. The persistent
 * <UnifiedMediaPlayer/> component subscribes to this store and delegates the
 * actual playback to the correct provider engine (Spotify Web SDK, SoundCloud
 * widget, YouTube IFrame API, Apple MusicKit) based on `current.provider`.
 *
 * Keeping playback intent in a store (rather than props) lets ANY component —
 * a feed card, a profile, search results — request playback by calling
 * `player.play(media)` without prop-drilling.
 */

export interface PlayerState {
  current: MediaEntity | null;
  isPlaying: boolean;
  /** 0..1 normalised playback progress, updated by the active engine. */
  progress: number;
  /** 0..1 volume. */
  volume: number;
  /** The engine reports readiness so the UI can show a loading state. */
  ready: boolean;
}

const initial: PlayerState = {
  current: null,
  isPlaying: false,
  progress: 0,
  volume: 0.8,
  ready: false
};

function createPlayer() {
  const store = writable<PlayerState>(initial);
  const { subscribe, update, set } = store;

  return {
    subscribe,

    /** Load a media entity and request playback. */
    play(media: MediaEntity) {
      update((s) => ({ ...s, current: media, isPlaying: true, progress: 0, ready: false }));
    },

    /** Toggle play/pause for the current media. */
    toggle() {
      update((s) => (s.current ? { ...s, isPlaying: !s.isPlaying } : s));
    },

    pause() {
      update((s) => ({ ...s, isPlaying: false }));
    },

    resume() {
      update((s) => (s.current ? { ...s, isPlaying: true } : s));
    },

    setVolume(v: number) {
      update((s) => ({ ...s, volume: Math.max(0, Math.min(1, v)) }));
    },

    /** Engines call these to report state back into the store. */
    _setProgress(progress: number) {
      update((s) => ({ ...s, progress }));
    },
    _setReady(ready: boolean) {
      update((s) => ({ ...s, ready }));
    },
    _setPlaying(isPlaying: boolean) {
      update((s) => ({ ...s, isPlaying }));
    },

    stop() {
      set(initial);
    },

    /** Snapshot accessor for imperative engine code. */
    snapshot() {
      return get(store);
    }
  };
}

export const player = createPlayer();

/** True when there is a track loaded — used to show/hide the player bar. */
export const hasTrack = derived(player, ($p) => $p.current !== null);
