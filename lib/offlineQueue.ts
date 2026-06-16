"use client";
/**
 * Tiny offline-write queue.
 *
 * Wraps mutating fetches so a journal entry / voice note saved while offline
 * survives the airplane mode and replays when the browser comes back online.
 *
 * Storage: localStorage (single key, JSON array). For an app with a low write
 * rate per user this is fine — IndexedDB would be overkill and harder to
 * inspect.
 *
 * Replay semantics:
 *   - First-in, first-out
 *   - On 5xx we keep the item and break (server is sick — try again later)
 *   - On 4xx we drop the item (the request itself is bad — retrying won't help)
 *   - Items also carry an `id` so consumers can dedupe optimistic UI state
 */

import { log } from "@/lib/log";

const KEY = "ann_offline_queue_v1";

export interface QueuedRequest {
  id: string;
  url: string;
  method: "POST" | "PUT" | "DELETE";
  body?: unknown;
  // Set by the queue itself; lets you label entries in DevTools
  queuedAt: string;
}

function load(): QueuedRequest[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(queue: QueuedRequest[]) {
  try { localStorage.setItem(KEY, JSON.stringify(queue)); } catch {}
}

function makeId(): string {
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

let flushing = false;
let listenersInstalled = false;

/**
 * Try a request now. If we're offline (or the request fails with a network
 * error), persist it and resolve `{ queued: true }` — the optimistic caller
 * can update its UI assuming success and let us drain later.
 */
export async function queuedFetch(req: Omit<QueuedRequest, "id" | "queuedAt"> & { id?: string }): Promise<
  | { ok: true; queued: false; response: Response }
  | { ok: true; queued: true;  id: string }
  | { ok: false; queued: false; status: number }
> {
  installListeners();
  const id = req.id ?? makeId();

  if (!isOnline()) {
    enqueue({ ...req, id, queuedAt: new Date().toISOString() });
    return { ok: true, queued: true, id };
  }

  try {
    const res = await fetch(req.url, {
      method: req.method,
      headers: req.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body:    req.body !== undefined ? JSON.stringify(req.body) : undefined,
    });
    if (res.status >= 500) {
      enqueue({ ...req, id, queuedAt: new Date().toISOString() });
      return { ok: true, queued: true, id };
    }
    if (!res.ok) return { ok: false, queued: false, status: res.status };
    return { ok: true, queued: false, response: res };
  } catch {
    // Network error — typical offline shape
    enqueue({ ...req, id, queuedAt: new Date().toISOString() });
    return { ok: true, queued: true, id };
  }
}

function enqueue(item: QueuedRequest) {
  const q = load();
  q.push(item);
  save(q);
  log.info({ msg: "offline:queued", url: item.url, method: item.method, id: item.id });
}

export async function flushQueue(): Promise<void> {
  if (flushing) return;
  if (!isOnline()) return;
  flushing = true;
  try {
    let q = load();
    while (q.length > 0) {
      const item = q[0];
      try {
        const res = await fetch(item.url, {
          method: item.method,
          headers: item.body !== undefined ? { "Content-Type": "application/json" } : undefined,
          body:    item.body !== undefined ? JSON.stringify(item.body) : undefined,
        });
        if (res.status >= 500) {
          // Server still sick — stop, keep order
          log.warn({ msg: "offline:flush stopped (5xx)", url: item.url, status: res.status });
          break;
        }
        // 2xx, 3xx, 4xx all consume the item — 4xx means the request itself
        // is rejected, and retrying it won't help
        q = q.slice(1);
        save(q);
        if (!res.ok) {
          log.warn({ msg: "offline:flush dropped (4xx)", url: item.url, status: res.status, id: item.id });
        }
      } catch (err) {
        // Network blip mid-flush — keep item, try again on next event
        log.warn({ msg: "offline:flush network error", url: item.url, err });
        break;
      }
    }
  } finally {
    flushing = false;
  }
}

export function pendingCount(): number {
  return load().length;
}

function installListeners() {
  if (listenersInstalled || typeof window === "undefined") return;
  listenersInstalled = true;
  window.addEventListener("online", () => { flushQueue(); });
  // Best-effort: also try when the page regains focus (covers cases where
  // `online` fired in the background and the user was on another tab)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") flushQueue();
  });
  // Drain anything that was queued in a previous session
  if (isOnline()) flushQueue();
}
