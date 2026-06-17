"use client";
import { useEffect, useState } from "react";

/**
 * Shared partner-presence state.
 *
 * PresenceLayer is the single SSE consumer for `presence:tick` events; it
 * feeds this store via {@link notePartnerTick}. Other components (the
 * "you're both here" banner, the doodle canvas) read derived online status
 * through {@link usePartnerPresence} without each opening their own listener.
 *
 * "Online" is a sliding window: the partner is considered here-right-now if
 * we've seen a tick from them within ONLINE_WINDOW. Ticks arrive every ~4s
 * while they're active (see PresenceLayer), so 32s tolerates a couple misses.
 */
export const ONLINE_WINDOW = 32_000;

interface PartnerState {
  name: string;
  section: string;
  lastSeen: number;
}

let _state: PartnerState | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

/** Called by PresenceLayer when a partner presence tick arrives over SSE. */
export function notePartnerTick(name?: string, section?: string) {
  _state = {
    name: name || _state?.name || "them",
    section: section || _state?.section || "",
    lastSeen: Date.now(),
  };
  notify();
}

export interface PartnerPresence {
  online: boolean;
  name: string | null;
  /** Section id the partner is currently viewing (null when offline). */
  section: string | null;
  lastSeen: number;
}

export function usePartnerPresence(): PartnerPresence {
  const [, force] = useState(0);
  useEffect(() => {
    const rerender = () => force((n) => n + 1);
    listeners.add(rerender);
    // Re-evaluate the sliding window even when no tick arrives, so the
    // "online" flag flips back to false after the partner goes quiet.
    const t = setInterval(rerender, 4000);
    return () => {
      listeners.delete(rerender);
      clearInterval(t);
    };
  }, []);

  const online = !!_state && Date.now() - _state.lastSeen < ONLINE_WINDOW;
  return {
    online,
    name: _state?.name ?? null,
    section: online ? _state?.section ?? null : null,
    lastSeen: _state?.lastSeen ?? 0,
  };
}
