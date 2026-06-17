"use client";
import { getUser } from "@/lib/userStore";
import { isRealtimeConnected } from "@/lib/calendarStore";

/**
 * Thin client over the app's unified SSE relay.
 *
 * The single calendar EventSource (see calendarStore) re-dispatches every
 * non-calendar server event as a `window` CustomEvent named `annapp:sse`,
 * with the server payload in `event.detail`. Every realtime feature listens
 * here instead of opening its own EventSource.
 */
export interface SSEDetail {
  type: string;
  userId?: string;
  [key: string]: unknown;
}

/** Subscribe to all relayed SSE events. Returns an unsubscribe fn. */
export function onSSE(handler: (detail: SSEDetail) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const fn = (e: Event) => {
    const detail = (e as CustomEvent).detail as SSEDetail | undefined;
    if (detail && typeof detail.type === "string") handler(detail);
  };
  window.addEventListener("annapp:sse", fn as EventListener);
  return () => window.removeEventListener("annapp:sse", fn as EventListener);
}

/**
 * Like {@link onSSE} but drops events the local user originated (the SSE
 * server broadcasts to the whole couple including the sender). Use this for
 * "the *other* person did something" UX — nudges, partner strokes, etc.
 */
export function onPartnerSSE(handler: (detail: SSEDetail) => void): () => void {
  return onSSE((detail) => {
    const me = getUser()?.userId;
    if (detail.userId && me && detail.userId === me) return;
    handler(detail);
  });
}

/** Is the shared realtime relay currently connected? */
export function isSSEConnected(): boolean {
  return isRealtimeConnected();
}

/**
 * Subscribe to realtime connection status changes. Fires `true` when the SSE
 * relay connects and `false` when it drops. Lets features (and the SWR stores)
 * fall back to faster polling while the long-lived connection is unavailable —
 * the main resilience story on serverless hosts that kill SSE.
 */
export function onSSEStatus(handler: (connected: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const fn = (e: Event) => {
    const connected = (e as CustomEvent).detail?.connected;
    if (typeof connected === "boolean") handler(connected);
  };
  window.addEventListener("annapp:sse-status", fn as EventListener);
  return () => window.removeEventListener("annapp:sse-status", fn as EventListener);
}
