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
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeSession(data: CalEntry[]) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch {}
}

let _cache: CalEntry[] | null = null;
let _inflight: Promise<CalEntry[]> | null = null;
let _sseSource: EventSource | null = null;

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

export async function fetchCalendarData(): Promise<CalEntry[]> {
  if (_cache) return _cache;
  const session = readSession();
  if (session) {
    _cache = session;
    startSSE();
    return _cache;
  }
  if (_inflight) return _inflight;
  _inflight = fetch("/api/calendar")
    .then(r => r.json())
    .then((arr: CalEntry[]) => {
      _cache = arr;
      _inflight = null;
      writeSession(arr);
      notify(arr);
      startSSE();
      return arr;
    })
    .catch(() => { _inflight = null; return []; });
  return _inflight;
}

export function invalidateCalendarCache() {
  _cache = null;
  _inflight = null;
  _sseSource?.close();
  _sseSource = null;
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
    return () => { cancelled = true; listeners.delete(handler); };
  }, []);

  return { data, loading };
}