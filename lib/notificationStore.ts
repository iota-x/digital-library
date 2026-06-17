"use client";
import { useEffect, useState } from "react";

/**
 * In-app notification feed — "what's new since you last looked".
 *
 * Generalises the one-off "new voice note" badge into a single persistent
 * feed. NudgeLayer (which already maps partner SSE events to toasts) also
 * records each event here via {@link addNotification}, so the bell shows a
 * history even if the user missed the transient toast.
 *
 * Storage: localStorage (single key, capped list). Per-device by design —
 * "what's new for me on this device since I last opened the bell".
 */

export interface AppNotification {
  /** Stable id — re-adding the same id updates in place (no dupes). */
  id: string;
  type: string;
  title: string;
  message: string;
  emoji: string;
  /** Optional in-app link to open on click. */
  href?: string;
  /** ISO timestamp. */
  at: string;
  read: boolean;
}

const KEY = "ann_notifications_v1";
const MAX = 50;
const listeners = new Set<(items: AppNotification[]) => void>();
let _items: AppNotification[] | null = null;

function load(): AppNotification[] {
  if (_items) return _items;
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    _items = raw ? JSON.parse(raw) : [];
  } catch { _items = []; }
  return _items!;
}

function persist(items: AppNotification[]) {
  _items = items;
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
  listeners.forEach(fn => fn([...items]));
}

/** Record a notification. Deduped by id; newest first; list capped at MAX. */
export function addNotification(n: Omit<AppNotification, "at" | "read"> & { at?: string }) {
  const items = load();
  const entry: AppNotification = {
    ...n,
    at: n.at ?? new Date().toISOString(),
    read: false,
  };
  const without = items.filter(i => i.id !== entry.id);
  persist([entry, ...without].slice(0, MAX));
}

export function markAllRead() {
  const items = load();
  if (!items.some(i => !i.read)) return;
  persist(items.map(i => ({ ...i, read: true })));
}

export function clearNotifications() {
  persist([]);
}

export function getUnreadCount(): number {
  return load().filter(i => !i.read).length;
}

/** React hook — live notification list + unread count. */
export function useNotifications(): {
  items: AppNotification[];
  unreadCount: number;
  markAllRead: () => void;
  clear: () => void;
} {
  const [items, setItems] = useState<AppNotification[]>(() => load());

  useEffect(() => {
    const fn = (next: AppNotification[]) => setItems(next);
    listeners.add(fn);
    setItems([...load()]);
    return () => { listeners.delete(fn); };
  }, []);

  return {
    items,
    unreadCount: items.filter(i => !i.read).length,
    markAllRead,
    clear: clearNotifications,
  };
}
