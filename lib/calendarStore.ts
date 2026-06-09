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

/* ── Module-level cache — survives tab switches within the same session ── */
let _cache: CalEntry[] | null = null;
let _promise: Promise<CalEntry[]> | null = null;
let _listeners: Array<(data: CalEntry[]) => void> = [];

function notify(data: CalEntry[]) {
  _listeners.forEach(fn => fn(data));
}

export async function fetchCalendarData(): Promise<CalEntry[]> {
  if (_cache) return _cache;
  if (_promise) return _promise;

  _promise = fetch("/api/calendar")
    .then(r => r.json())
    .then((arr: CalEntry[]) => {
      _cache = arr;
      _promise = null;
      notify(arr);
      return arr;
    })
    .catch(() => {
      _promise = null;
      return [];
    });

  return _promise;
}

export function invalidateCalendarCache() {
  _cache = null;
  _promise = null;
}

export function updateCalendarCache(entry: CalEntry) {
  if (_cache) {
    const idx = _cache.findIndex(e => e.date === entry.date);
    if (idx >= 0) _cache[idx] = entry;
    else _cache = [..._cache, entry];
    notify(_cache);
  }
}

export function deleteFromCalendarCache(date: string) {
  if (_cache) {
    _cache = _cache.filter(e => e.date !== date);
    notify(_cache);
  }
}

/* ── Hook: subscribe to the cache ── */
export function useCalendarData(): { data: CalEntry[]; loading: boolean } {
  const [data,    setData]    = useState<CalEntry[]>(_cache ?? []);
  const [loading, setLoading] = useState(!_cache);

  useEffect(() => {
    // If already cached, skip fetch
    if (_cache) { setData(_cache); setLoading(false); return; }

    setLoading(true);
    let cancelled = false;

    fetchCalendarData().then(arr => {
      if (!cancelled) { setData(arr); setLoading(false); }
    });

    // Subscribe to future updates (e.g. after save/delete)
    const handler = (arr: CalEntry[]) => { if (!cancelled) setData([...arr]); };
    _listeners.push(handler);

    return () => {
      cancelled = true;
      _listeners = _listeners.filter(fn => fn !== handler);
    };
  }, []);

  return { data, loading };
}