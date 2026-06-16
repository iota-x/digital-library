import { NextRequest, NextResponse } from "next/server";

/**
 * In-memory rate limiter — token-bucket per key (usually IP + route).
 *
 * Trade-off vs Redis-backed limiters: this resets when the serverless
 * instance recycles, but for a 2-person love-app deployed on Vercel
 * this is plenty. Survives bursts and gives the dev a clear signal
 * if a script starts hammering an endpoint.
 */

interface Bucket { count: number; resetAt: number }

declare global {
  var _rateLimitBuckets: Map<string, Bucket> | undefined;
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

export function rateLimit(req: NextRequest, opts: RateLimitOptions): RateLimitResult {
  maybePrune();
  const ip = getClientIp(req);
  const key = `${opts.scope}|${ip}|${opts.identifier ?? ""}`;
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

/** Helper that returns a 429 response with proper headers. */
export function tooManyRequests(retryAfter: number, message = "Too many requests, please slow down."): NextResponse {
  const res = NextResponse.json({ error: message, retryAfter }, { status: 429 });
  res.headers.set("Retry-After", String(retryAfter));
  return res;
}
