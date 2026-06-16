import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/log";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
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
