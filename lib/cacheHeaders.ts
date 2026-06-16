/**
 * Stale-while-revalidate Cache-Control for read endpoints.
 *
 * - `private` — never cached by shared proxies (data is per-couple)
 * - `max-age=10` — browser/SW may serve cached for 10s without hitting origin
 * - `stale-while-revalidate=30` — for the next 30s, serve stale + refresh in bg
 *
 * The client store still uses `cache: "no-store"` so a tab-focus revalidation
 * always pulls fresh — this header is the safety net for any incidental refetch
 * (e.g. another component, future CDN, etc.).
 */
export const READ_CACHE_HEADERS = {
  "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
};
