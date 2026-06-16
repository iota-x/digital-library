import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSession } from "@/lib/auth";
import { getCol } from "@/lib/mongo";
import { DEFAULT_SETTINGS } from "@/lib/themes";
import { serverEnv } from "@/lib/env";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const clientId     = serverEnv.SPOTIFY_CLIENT_ID;
  const clientSecret = serverEnv.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ tracks: [], noCredentials: true });
  }

  // Use couple's playlist if authenticated
  let playlistId = DEFAULT_SETTINGS.spotifyPlaylistId;
  try {
    const session = await getSession(req);
    if (session) {
      const couples = await getCol("couples");
      const couple  = await couples.findOne({ _id: new ObjectId(session.coupleId) });
      if (couple?.settings?.spotifyPlaylistId) {
        playlistId = couple.settings.spotifyPlaylistId;
      }
    }
  } catch {}

  try {
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      body: new URLSearchParams({ grant_type: "client_credentials" }),
    });
    if (!tokenRes.ok) return NextResponse.json({ tracks: [], error: true });

    const { access_token } = await tokenRes.json() as { access_token: string };
    const fields = "items(added_at,track(id,name,artists,album(images),external_urls,duration_ms))";
    const tracksRes = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100&fields=${encodeURIComponent(fields)}`,
      { headers: { Authorization: `Bearer ${access_token}` }, cache: "no-store" }
    );
    if (!tracksRes.ok) return NextResponse.json({ tracks: [], error: true });

    const { items } = await tracksRes.json() as { items: unknown[] };
    return NextResponse.json({ tracks: items });
  } catch (err) {
    log.error({ msg: "spotify fetch failed", err });
    return NextResponse.json({ tracks: [], error: true });
  }
}
