import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { NotificationDTO } from '$lib/types';

/**
 * Notification store backed by lightweight polling.
 *
 * `start()` begins polling `/api/notifications` on an interval; this is the
 * "polling-based" path described in the spec. A push transport (SSE/WebSocket)
 * can later replace `poll()` without changing consumers of this store.
 */
function createNotifications() {
  const items = writable<NotificationDTO[]>([]);
  const unread = writable(0);
  let timer: ReturnType<typeof setInterval> | null = null;

  async function poll() {
    if (!browser) return;
    try {
      const res = await fetch('/api/notifications', { headers: { accept: 'application/json' } });
      if (!res.ok) return;
      const data = (await res.json()) as { notifications: NotificationDTO[]; unread: number };
      items.set(data.notifications);
      unread.set(data.unread);
    } catch {
      /* transient network error — next tick retries */
    }
  }

  function start(intervalMs = 20000) {
    if (!browser || timer) return;
    poll();
    timer = setInterval(poll, intervalMs);
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  async function markAllRead() {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({})
    });
    unread.set(0);
    items.update((list) => list.map((n) => ({ ...n, read: true })));
  }

  return { items, unread, start, stop, poll, markAllRead };
}

export const notifications = createNotifications();
