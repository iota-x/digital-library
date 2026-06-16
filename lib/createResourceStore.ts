"use client";
import { useState, useEffect } from "react";

/**
 * Generic stale-while-revalidate store.
 *
 * - Reads from localStorage on first hook subscribe (instant paint, no spinner)
 * - Background-fetches in parallel and notifies subscribers when fresher data arrives
 * - Revalidates on tab focus, visibility change, and (light) interval polling
 * - Listens for SSE-driven invalidation events via the optional `sseEventTypes`
 *
 * Trade-off: per-resource staleness is acceptable here (love-app data, not banking).
 * Hard guarantee: any mutating action (add/update/delete) optimistically writes the
 * cache, then refetches in background so listeners self-heal if the server diverged.
 */

export interface ResourceStoreOptions<T> {
  /** localStorage key — bump version when shape changes */
  storageKey: string;
  /** GET endpoint returning T[] */
  endpoint: string;
  /** SSE event types that should trigger a refresh */
  sseEventTypes?: string[];
  /** Background poll interval in ms (default 60_000). 0 = disabled. */
  pollMs?: number;
}

export interface ResourceStore<T> {
  /** React hook — { data, loading } with SWR behaviour */
  useResource: () => { data: T[]; loading: boolean };
  /** Force a network refresh (silent — no spinner) */
  refresh: () => void;
  /** Replace the cache with the given array (e.g. after a server response) */
  setCache: (data: T[]) => void;
  /** Optimistic add — does NOT POST; combine with your fetch */
  addItem: (item: T) => void;
  /** Optimistic remove by predicate */
  removeWhere: (pred: (item: T) => boolean) => void;
  /** Drop everything (e.g. on logout) */
  invalidate: () => void;
}

export function createResourceStore<T>(opts: ResourceStoreOptions<T>): ResourceStore<T> {
  const { storageKey, endpoint, sseEventTypes = [], pollMs = 60_000 } = opts;
  const listeners = new Set<(data: T[]) => void>();
  let cache: T[] | null = null;
  let inflight: Promise<T[]> | null = null;
  let refreshing = false;

  function readSession(): T[] | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function writeSession(data: T[]) {
    try { localStorage.setItem(storageKey, JSON.stringify(data)); } catch {}
  }

  function notify(data: T[]) {
    listeners.forEach(fn => fn(data));
  }

  function refresh() {
    if (typeof window === "undefined" || refreshing) return;
    refreshing = true;
    fetch(endpoint, { cache: "no-store" })
      .then(r => r.json())
      .then((arr: T[]) => {
        if (!Array.isArray(arr)) return;
        const changed = JSON.stringify(arr) !== JSON.stringify(cache);
        if (changed) {
          cache = arr;
          writeSession(arr);
          notify([...arr]);
        }
      })
      .catch(() => {})
      .finally(() => { refreshing = false; });
  }

  async function fetchData(force = false): Promise<T[]> {
    if (cache && !force) { refresh(); return cache; }
    const session = !force ? readSession() : null;
    if (session && !force) {
      cache = session;
      refresh();
      return cache;
    }
    if (inflight) return inflight;
    inflight = fetch(endpoint, { cache: "no-store" })
      .then(r => r.json())
      .then((arr: T[]) => {
        if (!Array.isArray(arr)) arr = [] as T[];
        cache = arr;
        inflight = null;
        writeSession(arr);
        notify(arr);
        return arr;
      })
      .catch(() => { inflight = null; return cache ?? []; });
    return inflight;
  }

  function setCache(data: T[]) {
    cache = data;
    writeSession(data);
    notify([...data]);
  }

  function addItem(item: T) {
    if (!cache) cache = [];
    cache = [...cache, item];
    writeSession(cache);
    notify([...cache]);
  }

  function removeWhere(pred: (item: T) => boolean) {
    if (!cache) return;
    cache = cache.filter(x => !pred(x));
    writeSession(cache);
    notify([...cache]);
  }

  function invalidate() {
    cache = null;
    inflight = null;
    try { localStorage.removeItem(storageKey); } catch {}
  }

  function useResource(): { data: T[]; loading: boolean } {
    const [data,    setData]    = useState<T[]>(() => cache ?? readSession() ?? []);
    const [loading, setLoading] = useState<boolean>(() => !(cache ?? readSession()));

    useEffect(() => {
      const existing = cache ?? readSession();
      if (existing) { cache = existing; setData(existing); setLoading(false); }
      else setLoading(true);

      let cancelled = false;
      fetchData().then(arr => {
        if (!cancelled) { setData(arr); setLoading(false); }
      });

      const handler = (arr: T[]) => { if (!cancelled) setData([...arr]); };
      listeners.add(handler);

      const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
      const onSse = (e: Event) => {
        const type = (e as CustomEvent).detail?.type as string | undefined;
        if (type && sseEventTypes.some(t => type.startsWith(t))) refresh();
      };

      document.addEventListener("visibilitychange", onVisible);
      window.addEventListener("focus", refresh);
      if (sseEventTypes.length) window.addEventListener("annapp:sse", onSse);
      const poll = pollMs > 0 ? setInterval(refresh, pollMs) : null;

      return () => {
        cancelled = true;
        listeners.delete(handler);
        document.removeEventListener("visibilitychange", onVisible);
        window.removeEventListener("focus", refresh);
        if (sseEventTypes.length) window.removeEventListener("annapp:sse", onSse);
        if (poll) clearInterval(poll);
      };
    }, []);

    return { data, loading };
  }

  return { useResource, refresh, setCache, addItem, removeWhere, invalidate };
}
