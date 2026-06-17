import { NextRequest, NextResponse } from "next/server";
import type { Redis } from "ioredis";
import { serverEnv } from "@/lib/env";

/**
 * Rate limiter — fixed-window counter per key (usually IP + route).
 *
 * Two backends, chosen at runtime:
 *   • Redis (when REDIS_URL is set) — shared across serverless instances /
 *     regions, so limits actually hold on Vercel. Uses INCR + PEXPIRE.
 *   • In-memory (fallback) — resets when the instance recycles, fine for
 *     local dev or a single long-lived instance.
 *
 * The function is async because the Redis path is. If Redis is configured
 * but unreachable, we fail OPEN (allow the request) rather than locking the
 * 2-person app out — and log once so the misconfig is visible.
 */

interface Bucket { count: number; resetAt: number }

declare global {
  // eslint-disable-next-line no-var
  var _rateLimitBuckets: Map<string, Bucket> | undefined;
  // eslint-disable-next-line no-var
  var _rateLimitRedis: Redis | null | undefined;
}

if (!global._rateLimitBuckets) global._rateLimitBuckets = new Map();
const buckets = global._rateLimitBuckets;

// Periodically prune expired buckets so the map doesn't grow forever
let lastPrune = Date.now();
function maybePrune() {
  const now = Date.now();
  if (now - lastPrune < 60_000) return;
  lastPrune = now;
  for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
}

/**
 * Lazily build a shared Redis client. Returns null if REDIS_URL is unset or
 * the client could not be created — callers then use the in-memory path.
 * Cached on `global` so HMR / repeated route invocations reuse one socket.
 */
async function getRedis(): Promise<Redis | null> {
  if (global._rateLimitRedis !== undefined) return global._rateLimitRedis;
  const url = serverEnv.REDIS_URL;
  if (!url) {
    global._rateLimitRedis = null;
    return null;
  }
  try {
    const { default: IORedis } = await import("ioredis");
    const client = new IORedis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: false,
      // Don't spam reconnects forever if the container is down
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
    });
    client.on("error", (err) => {
      // Single line so a down container doesn't flood logs
      if ((client as Redis & { _loggedErr?: boolean })._loggedErr) return;
      (client as Redis & { _loggedErr?: boolean })._loggedErr = true;
      console.warn("[rateLimit] Redis error, falling back to in-memory:", err.message);
    });
    global._rateLimitRedis = client;
    return client;
  } catch (err) {
    console.warn("[rateLimit] Could not init Redis, using in-memory:", (err as Error).message);
    global._rateLimitRedis = null;
    return null;
  }
}

export function getClientIp(req: NextRequest): string {
  // Trust forwarded headers from Vercel / common proxies, fall back to "unknown"
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

interface RateLimitOptions {
  /** Unique scope name, e.g. "auth:login" */
  scope: string;
  /** Maximum allowed requests inside the window. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Optional extra identifier (e.g. an email) joined with the IP. */
  identifier?: string;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfter: number; // seconds until window resets
}

function memoryLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  maybePrune();
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, remaining: opts.max - 1, retryAfter: 0 };
  }
  if (bucket.count >= opts.max) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count++;
  return { ok: true, remaining: opts.max - bucket.count, retryAfter: 0 };
}

async function redisLimit(client: Redis, key: string, opts: RateLimitOptions): Promise<RateLimitResult> {
  // INCR then set expiry on first hit. Pipelined to one round-trip.
  const redisKey = `rl:${key}`;
  const pipeline = client.multi();
  pipeline.incr(redisKey);
  pipeline.pttl(redisKey);
  const res = await pipeline.exec();
  if (!res) throw new Error("redis pipeline returned null");

  const count = Number(res[0][1]);
  let ttl = Number(res[1][1]);

  // pttl is -1 when the key has no expiry yet (i.e. first INCR created it)
  if (ttl < 0) {
    await client.pexpire(redisKey, opts.windowMs);
    ttl = opts.windowMs;
  }

  if (count > opts.max) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil(ttl / 1000) };
  }
  return { ok: true, remaining: Math.max(0, opts.max - count), retryAfter: 0 };
}

export async function rateLimit(req: NextRequest, opts: RateLimitOptions): Promise<RateLimitResult> {
  const ip = getClientIp(req);
  const key = `${opts.scope}|${ip}|${opts.identifier ?? ""}`;

  const client = await getRedis();
  if (client && client.status === "ready") {
    try {
      return await redisLimit(client, key, opts);
    } catch {
      // Redis hiccup — fall through to in-memory so the request isn't blocked
      return memoryLimit(key, opts);
    }
  }
  return memoryLimit(key, opts);
}

/** Helper that returns a 429 response with proper headers. */
export function tooManyRequests(retryAfter: number, message = "Too many requests, please slow down."): NextResponse {
  const res = NextResponse.json({ error: message, retryAfter }, { status: 429 });
  res.headers.set("Retry-After", String(retryAfter));
  return res;
}
