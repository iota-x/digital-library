"use client";
import { useState, useEffect } from "react";

export interface CalEntry {
  date: string;
  note: string;
  photos: string[];
  special: boolean;
  specialLabel: string;
  mood: string;
}

const SESSION_KEY = "cal_cache_v1";
const listeners: Set<(data: CalEntry[]) => void> = new Set();

/* ── Read from sessionStorage on first import ── */
function readSession(): CalEntry[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeSession(data: CalEntry[]) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch {}
}

/* ── In-memory cache (stays alive as long as the JS module is alive) ── */
let _cache: CalEntry[] | null = null;
let _inflight: Promise<CalEntry[]> | null = null;

function notify(data: CalEntry[]) {
  listeners.forEach(fn => fn(data));
}

export async function fetchCalendarData(): Promise<CalEntry[]> {
  // 1. Already in memory
  if (_cache) return _cache;

  // 2. Already in sessionStorage (survives tab switch without re-fetching)
  const session = readSession();
  if (session) {
    _cache = session;
    return _cache;
  }

  // 3. Already fetching — share the same promise
  if (_inflight) return _inflight;

  // 4. Fresh fetch
  _inflight = fetch("/api/calendar")
    .then(r => r.json())
    .then((arr: CalEntry[]) => {
      _cache = arr;
      _inflight = null;
      writeSession(arr);
      notify(arr);
      return arr;
    })
    .catch(() => { _inflight = null; return []; });

  return _inflight;
}

export function invalidateCalendarCache() {
  _cache = null;
  _inflight = null;
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
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

/* ── React hook ── */
export function useCalendarData(): { data: CalEntry[]; loading: boolean } {
  // Initialise synchronously from whatever is already cached
  const [data,    setData]    = useState<CalEntry[]>(() => _cache ?? readSession() ?? []);
  const [loading, setLoading] = useState<boolean>(() => !(_cache ?? readSession()));

  useEffect(() => {
    // Already have data — no spinner needed
    if (_cache || readSession()) {
      const existing = _cache ?? readSession()!;
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
    return () => { cancelled = true; listeners.delete(handler); };
  }, []);

  return { data, loading };
}