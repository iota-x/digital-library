/**
 * Validated env access.
 *
 * Replaces `process.env.X!` non-null assertions, which silently produce
 * `undefined` until a request actually hits a missing var — by which point
 * the stack trace points at jose/web-push/mongo internals, not at the
 * misconfiguration.
 *
 * Pattern: read once, throw with a clear name on first access. Server-only
 * keys are not exposed to the client (Next.js already enforces that for
 * non-NEXT_PUBLIC_ names; this file just makes the access typed and loud).
 */

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

/** Server-only secrets. Throws if read on the client. */
export const serverEnv = {
  get JWT_SECRET()           { return required("JWT_SECRET"); },
  get MONGODB_URI()          { return required("MONGODB_URI"); },
  get CLOUDINARY_API_KEY()   { return required("CLOUDINARY_API_KEY"); },
  get CLOUDINARY_API_SECRET(){ return required("CLOUDINARY_API_SECRET"); },
  get VAPID_SUBJECT()        { return required("VAPID_SUBJECT"); },
  get VAPID_PRIVATE_KEY()    { return required("VAPID_PRIVATE_KEY"); },
  // Optional with sensible runtime fallbacks
  get RESEND_API_KEY()       { return optional("RESEND_API_KEY"); },
  // Gmail SMTP fallback (no domain needed). When both are set, transactional
  // mail goes out through Gmail instead of Resend. The password is a Google
  // "App Password" (16 chars), not the account password.
  get GMAIL_USER()           { return optional("GMAIL_USER"); },
  get GMAIL_APP_PASSWORD()   { return optional("GMAIL_APP_PASSWORD").replace(/\s+/g, ""); },
  get SPOTIFY_CLIENT_ID()    { return optional("SPOTIFY_CLIENT_ID"); },
  get SPOTIFY_CLIENT_SECRET(){ return optional("SPOTIFY_CLIENT_SECRET"); },
  get NOTIFY_EMAIL_1()       { return optional("NOTIFY_EMAIL_1"); },
  get NOTIFY_EMAIL_2()       { return optional("NOTIFY_EMAIL_2"); },
  get EMAIL_FROM()           { return optional("EMAIL_FROM", "Us <onboarding@resend.dev>"); },
  // Optional: enables cross-instance rate limiting. Falls back to in-memory when
  // unset. Accepts UPSTASH_REDIS_URL too — the rediss:// string Upstash exposes —
  // so the Vercel/Upstash integration works without renaming a var. (Note: this
  // is NOT the UPSTASH_REDIS_REST_URL — that's an HTTPS endpoint ioredis can't use.)
  get REDIS_URL()            { return optional("REDIS_URL") || optional("UPSTASH_REDIS_URL"); },
  // Optional: home coordinates (latitude/longitude) for the per-day weather
  // snapshot on calendar entries. If unset, the weather feature is a no-op.
  get WEATHER_LAT()          { return optional("WEATHER_LAT"); },
  get WEATHER_LON()          { return optional("WEATHER_LON"); },
};

/** Public env — safe to read from the client.
 *
 * IMPORTANT: these MUST reference `process.env.NEXT_PUBLIC_*` *statically*
 * (literal property access). Next.js inlines NEXT_PUBLIC_ vars into the client
 * bundle by find-and-replacing those exact expressions at build time. A
 * dynamic read — `process.env[name]` via the optional() helper — is NOT
 * inlined and resolves to undefined in the browser. (That bug previously made
 * push notifications fail: VAPID_PUBLIC_KEY was always "" on the client.) */
export const publicEnv = {
  get CLOUDINARY_CLOUD_NAME() { return process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? ""; },
  get VAPID_PUBLIC_KEY()      { return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""; },
  get APP_NAME()              { return process.env.NEXT_PUBLIC_APP_NAME ?? "Us"; },
};
