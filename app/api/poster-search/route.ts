import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/log";

/** A URL that already points straight at an image — no resolving needed. */
function isDirectImage(url: string): boolean {
  return /^data:image\//i.test(url) || /\.(jpe?g|png|webp|gif|avif|bmp|svg)(\?|$)/i.test(url);
}

/** Reject non-http(s) and obvious private/loopback hosts so the unfurl fetch
 *  can't be pointed at internal services (basic SSRF guard). */
function isResolvableUrl(raw: string): URL | null {
  let u: URL;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local")) return null;
  if (/^(127\.|10\.|169\.254\.|192\.168\.|0\.)/.test(host)) return null;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return null;
  if (host === "::1" || host === "[::1]") return null;
  return u;
}

function metaContent(html: string, patterns: RegExp[]): string {
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return "";
}

/** Fetch a webpage and pull its poster/cover out of the social-share meta tags
 *  (og:image, then twitter:image). Lets a user paste a movie/show *page* link
 *  (e.g. an IMDb title page) and still get a real poster image. */
async function resolvePosterFromPage(url: string): Promise<string> {
  // Already an image? Hand it straight back.
  if (isDirectImage(url)) return url;
  const u = isResolvableUrl(url);
  if (!u) return "";

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const r = await fetch(u, {
      cache: "no-store",
      redirect: "follow",
      signal: ctrl.signal,
      // A browser-like UA — some sites (IMDb included) only emit og tags then.
      headers: { "user-agent": "Mozilla/5.0 (compatible; AnnAppPosterBot/1.0)", accept: "text/html" },
    });
    if (!r.ok) return "";
    const ct = r.headers.get("content-type") ?? "";
    // If the link itself *is* an image, just use it.
    if (ct.startsWith("image/")) return u.toString();
    if (!ct.includes("html")) return "";
    // Only need the <head>; cap the body so a huge page can't blow memory.
    const html = (await r.text()).slice(0, 200_000);
    const found = metaContent(html, [
      /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    ]);
    if (!found) return "";
    // Resolve protocol-relative / relative og:image values against the page.
    try { return new URL(found, u).toString(); } catch { return found; }
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Resolve mode: turn a pasted page link into its poster image.
  const url = searchParams.get("url");
  if (url) {
    try {
      const poster = await resolvePosterFromPage(url.trim());
      return NextResponse.json({ url: poster });
    } catch (err) {
      log.warn({ msg: "poster resolve failed", err, url });
      return NextResponse.json({ url: "" });
    }
  }

  const title = searchParams.get("title") ?? "";
  const type  = searchParams.get("type")  ?? "movie";

  if (!title.trim()) return NextResponse.json({ urls: [] });

  try {
    if (type === "anime") {
      const r = await fetch(
        `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=8&sfw=true`,
        { cache: "no-store" }
      );
      const d = await r.json() as { data?: { images?: { jpg?: { large_image_url?: string } } }[] };
      return NextResponse.json({
        urls: (d.data ?? []).map(a => a.images?.jpg?.large_image_url ?? "").filter(Boolean),
      });
    }

    const media  = type === "movie" ? "movie"  : "tvShow";
    const entity = type === "movie" ? "movie"  : "tvSeason";
    const r = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(title)}&media=${media}&entity=${entity}&limit=8`,
      { cache: "no-store" }
    );
    const d = await r.json() as { results?: { artworkUrl100?: string }[] };
    return NextResponse.json({
      urls: (d.results ?? [])
        .map(x => (x.artworkUrl100 ?? "").replace("100x100bb", "600x600bb"))
        .filter(Boolean),
    });
  } catch (err) {
    log.warn({ msg: "poster search failed", err, title, type });
    return NextResponse.json({ urls: [] });
  }
}
