import { getCol } from "@/lib/mongo";

/**
 * Best-effort IP → coarse location, with a persistent cache.
 *
 * Geo can't be derived offline, so this resolves an IP via a free, key-less
 * endpoint (ipwho.is) and caches the result in `geoCache` keyed by IP — so each
 * IP is looked up at most once. Everything fails soft: a private/empty IP, a
 * network error, or a non-OK response all yield { country: "Unknown" } rather
 * than throwing. Only ever called from admin routes (low volume, bounded fan-out).
 */

export interface Geo { country: string; city: string }

const UNKNOWN: Geo = { country: "Unknown", city: "" };

function isPublicIp(ip: string): boolean {
  if (!ip) return false;
  if (ip === "::1" || ip.startsWith("127.") || ip.startsWith("0.")) return false;
  if (/^10\./.test(ip) || /^192\.168\./.test(ip)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return false;
  if (ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd")) return false;
  return true;
}

export async function lookupIp(ip: string): Promise<Geo> {
  if (!isPublicIp(ip)) return UNKNOWN;
  try {
    const cache = await getCol("geoCache");
    const hit = await cache.findOne({ _id: ip as unknown as object });
    if (hit) return { country: hit.country ?? "Unknown", city: hit.city ?? "" };

    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return UNKNOWN;
    const data = await res.json();
    const geo: Geo = data?.success
      ? { country: data.country ?? "Unknown", city: data.city ?? "" }
      : UNKNOWN;

    // Cache even "Unknown" so a failed/edge IP isn't re-fetched every load.
    await cache.updateOne(
      { _id: ip as unknown as object },
      { $set: { ...geo, at: new Date() } },
      { upsert: true },
    );
    return geo;
  } catch {
    return UNKNOWN;
  }
}

/** Resolve many IPs (deduped, capped) in parallel → map of ip → Geo. */
export async function lookupIps(ips: string[], cap = 50): Promise<Map<string, Geo>> {
  const unique = [...new Set(ips.filter(Boolean))].slice(0, cap);
  const out = new Map<string, Geo>();
  await Promise.all(
    unique.map(async (ip) => { out.set(ip, await lookupIp(ip)); }),
  );
  return out;
}
