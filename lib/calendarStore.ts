"use client";
import { useState, useEffect } from "react";

export interface CalEntry {
  date: string;
  note: string;
  photos: string[];
  special: boolean;
  specialLabel: string;
  mood: string;
  pinnedNote: string;
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

function startSSE() {
  if (typeof window === "undefined") return;
  if (_sseSource) return;
  try {
    const es = new EventSource("/api/calendar/stream");
    _sseSource = es;
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "connected") return;
        applySSEEvent(data);
      } catch {}
    };
    es.onerror = () => {
      es.close();
      _sseSource = null;
      setTimeout(startSSE, 3000);
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
  _sseSource?.close();
  _sseSource = null;
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

    // Light polling fallback (60s) in case SSE + focus both miss it
    // (e.g. tab left open and focused on a desktop monitor).
    const poll = setInterval(refreshCalendarData, 60_000);

    return () => {
      cancelled = true;
      listeners.delete(handler);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refreshCalendarData);
      clearInterval(poll);
    };
  }, []);

  return { data, loading };
}