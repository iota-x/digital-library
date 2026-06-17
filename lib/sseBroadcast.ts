import type { Redis } from "ioredis";
import { serverEnv } from "@/lib/env";

/**
 * Realtime fan-out backbone for the app's single SSE relay.
 *
 * THE PROBLEM (P0): SSE controllers live in-process. On Vercel the instance
 * handling a write (POST /api/calendar) is usually NOT the instance holding
 * the partner's open SSE stream, so a purely in-memory broadcast fires into
 * the void and the partner never gets the live event.
 *
 * THE FIX: Redis Pub/Sub as the fan-out bus.
 *   • Every instance that has ≥1 connected SSE client runs a subscriber on the
 *     shared channel `sse:broadcast`.
 *   • broadcastToCouple() delivers to local clients immediately AND publishes
 *     the event so every OTHER instance delivers to its local clients too.
 *   • Each message carries the originating instance id so the publisher's own
 *     subscriber skips it — instant local delivery, no cross-instance dupes.
 *
 * When REDIS_URL is unset (local dev / single long-lived instance) this
 * degrades gracefully to pure in-memory delivery — exactly the old behaviour.
 *
 * NOTE on runtime: the SSE route stays `runtime = "nodejs"` because ioredis
 * needs a TCP socket (unavailable on the edge runtime). That's the deliberate
 * tradeoff vs. "just move the stream to edge" — edge gives longer-lived
 * connections but cannot host the Redis subscriber that makes fan-out work,
 * and fan-out is the bigger correctness win.
 */

type SSEClient = {
  id: string;
  controller: ReadableStreamDefaultController;
  coupleId: string;
};

const CHANNEL = "sse:broadcast";
// Unique per serverless instance / process. Used to drop our own echoes.
const INSTANCE_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

declare global {
  // eslint-disable-next-line no-var
  var _sseClients: Map<string, SSEClient> | undefined;
  // eslint-disable-next-line no-var
  var _ssePub: Redis | null | undefined;
  // eslint-disable-next-line no-var
  var _sseSub: Redis | null | undefined;
}

if (!global._sseClients) {
  global._sseClients = new Map();
}
const clients = global._sseClients;

interface FanoutMessage {
  origin: string;
  coupleId: string;
  payload: object;
}

/** Deliver a payload to every local client belonging to the couple. */
function deliverLocal(coupleId: string, payload: object) {
  const msg = `data: ${JSON.stringify(payload)}\n\n`;
  const bytes = new TextEncoder().encode(msg);
  const dead: string[] = [];
  clients.forEach((client) => {
    if (client.coupleId !== coupleId) return;
    try {
      client.controller.enqueue(bytes);
    } catch {
      dead.push(client.id);
    }
  });
  dead.forEach((id) => clients.delete(id));
}

/**
 * Build (once) the two Redis connections pub/sub needs. ioredis requires a
 * DEDICATED connection for SUBSCRIBE (a subscribed connection can't issue
 * normal commands), so publisher and subscriber are separate sockets. Both
 * are cached on `global` so HMR / repeated invocations reuse them.
 *
 * Returns null when REDIS_URL is unset — callers then use pure local delivery.
 */
async function getPublisher(): Promise<Redis | null> {
  if (global._ssePub !== undefined) return global._ssePub;
  const url = serverEnv.REDIS_URL;
  if (!url) {
    global._ssePub = null;
    return null;
  }
  try {
    const { default: IORedis } = await import("ioredis");
    const pub = new IORedis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (times) => (times > 5 ? null : Math.min(times * 300, 2000)),
    });
    pub.on("error", (err) => {
      if ((pub as Redis & { _logged?: boolean })._logged) return;
      (pub as Redis & { _logged?: boolean })._logged = true;
      console.warn("[sse] Redis publisher error, fan-out limited to local instance:", err.message);
    });
    global._ssePub = pub;
    return pub;
  } catch (err) {
    console.warn("[sse] Could not init Redis publisher:", (err as Error).message);
    global._ssePub = null;
    return null;
  }
}

/**
 * Lazily start the subscriber for THIS instance. Idempotent — safe to call on
 * every new SSE connection. No-op when Redis is unconfigured.
 */
export function ensureFanoutSubscriber(): void {
  if (global._sseSub !== undefined) return; // already started (or known-absent)
  const url = serverEnv.REDIS_URL;
  if (!url) {
    global._sseSub = null;
    return;
  }
  // Mark as "starting" immediately so concurrent connections don't double-init.
  global._sseSub = null;
  import("ioredis")
    .then(({ default: IORedis }) => {
      const sub = new IORedis(url, {
        maxRetriesPerRequest: null,
        retryStrategy: (times) => Math.min(times * 500, 5000),
      });
      sub.on("error", (err) => {
        if ((sub as Redis & { _logged?: boolean })._logged) return;
        (sub as Redis & { _logged?: boolean })._logged = true;
        console.warn("[sse] Redis subscriber error:", err.message);
      });
      sub.on("message", (channel, raw) => {
        if (channel !== CHANNEL) return;
        try {
          const m = JSON.parse(raw) as FanoutMessage;
          if (m.origin === INSTANCE_ID) return; // our own echo — already delivered locally
          deliverLocal(m.coupleId, m.payload);
        } catch {
          /* ignore malformed fan-out frames */
        }
      });
      sub.subscribe(CHANNEL).catch((err) => {
        console.warn("[sse] Redis subscribe failed:", (err as Error).message);
      });
      global._sseSub = sub;
    })
    .catch((err) => {
      console.warn("[sse] Could not init Redis subscriber:", (err as Error).message);
      global._sseSub = null;
    });
}

export function addSSEClient(id: string, controller: ReadableStreamDefaultController, coupleId: string) {
  clients.set(id, { id, controller, coupleId });
  // Ensure this instance is listening to the fan-out bus so it can relay
  // events written on other instances to this freshly-connected client.
  ensureFanoutSubscriber();
}

export function removeSSEClient(id: string) {
  clients.delete(id);
}

/**
 * Broadcast an event to both partners of a couple, wherever their SSE streams
 * happen to be connected. Fire-and-forget: callers don't await.
 */
export function broadcastToCouple(coupleId: string, payload: object) {
  // 1) Instant delivery to clients on THIS instance.
  deliverLocal(coupleId, payload);
  // 2) Fan out to every other instance via Redis (best-effort).
  getPublisher()
    .then((pub) => {
      if (!pub) return;
      const message: FanoutMessage = { origin: INSTANCE_ID, coupleId, payload };
      return pub.publish(CHANNEL, JSON.stringify(message));
    })
    .catch(() => {
      /* Redis hiccup — local delivery already happened; partner reconciles via
         the calendar store's focus/visibility/poll backstops. */
    });
}

// Keep old name as alias for calendarStore compatibility
export const broadcastCalendarUpdate = broadcastToCouple;
