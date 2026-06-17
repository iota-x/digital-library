"use client";
import { useState, useEffect } from "react";

export interface Sticker {
  id: string;
  emoji: string;
  /** 0–1 fraction of the photo's width (origin top-left). */
  x: number;
  /** 0–1 fraction of the photo's height. */
  y: number;
  /** Font size in rem. */
  size: number;
}

export interface CalEntry {
  date: string;
  note: string;
  photos: string[];
  /** Stickers laid onto a specific photo, keyed by photo URL. */
  photoStickers?: Record<string, Sticker[]>;
  /** Emoji → list of userIds who left that reaction on this entry. */
  reactions?: Record<string, string[]>;
  special: boolean;
  specialLabel: string;
  mood: string;
  pinnedNote: string;
  /** Per-day weather snapshot, captured once when today's entry is first saved. */
  weather?: WeatherSnapshot | null;
}

export interface WeatherSnapshot {
  code: number;
  tempMaxC: number;
  tempMinC: number;
  emoji: string;
  label: string;
}

const SESSION_KEY = "cal_cache_v2";
const listeners: Set<(data: CalEntry[]) => void> = new Set();

function readSession(): CalEntry[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeSession(data: CalEntry[]) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch {}
}

let _cache: CalEntry[] | null = null;
let _inflight: Promise<CalEntry[]> | null = null;
let _sseSource: EventSource | null = null;
let _refreshing = false;
let _coupleId = "";
let _sseRetry = 0;
let _sseReconnectTimer: ReturnType<typeof setTimeout> | null = null;
let _sseHealthy = false;

/** Whether the realtime (SSE) relay is currently connected. Consumers poll
 *  faster when this is false so the fallback channel stays responsive. */
export function isRealtimeConnected(): boolean {
  return _sseHealthy;
}

function setSSEStatus(connected: boolean) {
  if (_sseHealthy === connected) return;
  _sseHealthy = connected;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("annapp:sse-status", { detail: { connected } }));
  }
}

function notify(data: CalEntry[]) {
  listeners.forEach(fn => fn(data));
}

function applySSEEvent(event: { type: string; entry?: CalEntry; date?: string }) {
  if (!_cache) return;
  if (event.type === "update" && event.entry) {
    const idx = _cache.findIndex(e => e.date === event.entry!.date);
    if (idx >= 0) _cache[idx] = event.entry;
    else _cache = [..._cache, event.entry];
  } else if (event.type === "delete" && event.date) {
    _cache = _cache.filter(e => e.date !== event.date);
  }
  writeSession(_cache);
  notify([..._cache]);
}

function startSSE(coupleId?: string) {
  if (typeof window === "undefined") return;
  if (_sseSource) return;
  const id = coupleId ?? _coupleId;
  if (_sseReconnectTimer) { clearTimeout(_sseReconnectTimer); _sseReconnectTimer = null; }
  try {
    const url = `/api/calendar/stream${id ? `?coupleId=${encodeURIComponent(id)}` : ""}`;
    const es = new EventSource(url);
    _sseSource = es;
    es.onopen = () => { _sseRetry = 0; setSSEStatus(true); };
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        // A "connected" frame confirms the relay is live even if onopen
        // didn't fire (some proxies buffer until first byte).
        if (data.type === "connected") { _sseRetry = 0; setSSEStatus(true); return; }
        // Calendar events are applied directly; other event types
        // are forwarded to any listeners registered via onSSEEvent
        if (data.type === "update" || data.type === "delete") {
          applySSEEvent(data);
        } else {
          window.dispatchEvent(new CustomEvent("annapp:sse", { detail: data }));
        }
      } catch {}
    };
    es.onerror = () => {
      es.close();
      _sseSource = null;
      setSSEStatus(false);
      // Exponential backoff (3s → 30s cap) so a host that refuses to keep
      // SSE alive doesn't get hammered with a tight reconnect loop. The
      // focus/visibility/poll backstops keep data fresh meanwhile.
      const delay = Math.min(30_000, 3_000 * 2 ** _sseRetry);
      _sseRetry++;
      _sseReconnectTimer = setTimeout(() => startSSE(id), delay);
    };
  } catch {}
}

/* ─── Background revalidation ───────────────────────────────────────────
   SSE can silently drop (serverless hosts kill long-lived connections,
   tab was backgrounded, phone slept, etc). Without this, a stale
   localStorage snapshot or a missed SSE event means one device never
   sees another device's changes until localStorage is cleared.
   This fetches fresh data, diffs it against cache, and notifies listeners
   only if something actually changed — silent, no loading spinner.
   ──────────────────────────────────────────────────────────────────────── */
export function refreshCalendarData() {
  if (typeof window === "undefined" || _refreshing) return;
  _refreshing = true;
  fetch("/api/calendar", { cache: "no-store" })
    .then(r => r.json())
    .then((arr: CalEntry[]) => {
      const changed = JSON.stringify(arr) !== JSON.stringify(_cache);
      if (changed) {
        _cache = arr;
        writeSession(arr);
        notify([...arr]);
      }
    })
    .catch(() => {})
    .finally(() => { _refreshing = false; });
}

export async function fetchCalendarData(force = false): Promise<CalEntry[]> {
  if (_cache && !force) {
    // Serve cached data instantly, but always revalidate in the background
    // so a stale snapshot self-heals without blocking the UI.
    refreshCalendarData();
    return _cache;
  }
  const session = !force ? readSession() : null;
  if (session && !force) {
    _cache = session;
    startSSE();
    refreshCalendarData();
    return _cache;
  }
  if (_inflight) return _inflight;
  _inflight = fetch("/api/calendar", { cache: "no-store" })
    .then(r => r.json())
    .then((arr: CalEntry[]) => {
      _cache = arr;
      _inflight = null;
      writeSession(arr);
      notify(arr);
      startSSE();
      return arr;
    })
    .catch(() => { _inflight = null; return _cache ?? []; });
  return _inflight;
}

export function invalidateCalendarCache() {
  _cache = null;
  _inflight = null;
  _coupleId = "";
  _sseSource?.close();
  _sseSource = null;
  if (_sseReconnectTimer) { clearTimeout(_sseReconnectTimer); _sseReconnectTimer = null; }
  _sseRetry = 0;
  setSSEStatus(false);
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

export function updateCalendarCache(entry: CalEntry) {
  if (!_cache) return;
  const idx = _cache.findIndex(e => e.date === entry.date);
  if (idx >= 0) _cache[idx] = entry;
  else _cache.push(entry);
  writeSession(_cache);
  notify([..._cache]);
}

export function deleteFromCalendarCache(date: string) {
  if (!_cache) return;
  _cache = _cache.filter(e => e.date !== date);
  writeSession(_cache);
  notify([..._cache]);
}

/** Ensure the shared realtime (SSE) connection is open without forcing a
 *  calendar refetch. The calendar EventSource is the single relay for ALL
 *  realtime app events (presence, doodle, daily, watch-together, …) — they
 *  arrive as `annapp:sse` window events. Pages that don't fetch the calendar
 *  (e.g. /shared) still need the relay, so this is called from PasswordGate
 *  on every authenticated load. Safe to call repeatedly (startSSE is guarded). */
export function ensureRealtime(coupleId: string) {
  if (typeof window === "undefined") return;
  if (coupleId) _coupleId = coupleId;
  startSSE(coupleId || _coupleId);
}

/** Initialize the calendar store with the couple's ID and start fetching + SSE */
export function initCalendarStore(coupleId: string) {
  _coupleId = coupleId;
  // Close any existing SSE connection so it reopens with the right coupleId
  if (_sseSource) {
    _sseSource.close();
    _sseSource = null;
  }
  if (_sseReconnectTimer) { clearTimeout(_sseReconnectTimer); _sseReconnectTimer = null; }
  _sseRetry = 0;
  fetchCalendarData(true).then(() => {
    startSSE(coupleId);
  });
}

export function useCalendarData(): { data: CalEntry[]; loading: boolean } {
  const [data,    setData]    = useState<CalEntry[]>(() => _cache ?? readSession() ?? []);
  const [loading, setLoading] = useState<boolean>(() => !(_cache ?? readSession()));

  useEffect(() => {
    const existing = _cache ?? readSession();
    if (existing) {
      _cache = existing;
      setData(existing);
      setLoading(false);
    } else {
      setLoading(true);
    }
    let cancelled = false;
    fetchCalendarData().then(arr => {
      if (!cancelled) { setData(arr); setLoading(false); }
    });
    const handler = (arr: CalEntry[]) => { if (!cancelled) setData([...arr]); };
    listeners.add(handler);

    // Revalidate whenever the tab/page becomes visible or regains focus —
    // this is the main fix for "uploaded on phone, laptop doesn't see it":
    // the laptop tab was just sitting on stale cached/SSE-missed data.
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshCalendarData();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refreshCalendarData);

    // Adaptive polling fallback in case SSE + focus both miss it (tab left
    // open on a desktop monitor, or a host that won't keep SSE alive).
    // 60s while SSE is healthy; tighten to 15s while it's disconnected since
    // polling is then the only fresh-data channel.
    let poll: ReturnType<typeof setInterval> | null = null;
    const applyInterval = (connected: boolean) => {
      if (poll) clearInterval(poll);
      poll = setInterval(refreshCalendarData, connected ? 60_000 : 15_000);
    };
    applyInterval(_sseHealthy);
    const onStatus = (e: Event) => {
      const connected = (e as CustomEvent).detail?.connected;
      if (typeof connected !== "boolean") return;
      if (!connected) refreshCalendarData();
      applyInterval(connected);
    };
    window.addEventListener("annapp:sse-status", onStatus as EventListener);

    return () => {
      cancelled = true;
      listeners.delete(handler);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refreshCalendarData);
      window.removeEventListener("annapp:sse-status", onStatus as EventListener);
      if (poll) clearInterval(poll);
    };
  }, []);

  return { data, loading };
}
