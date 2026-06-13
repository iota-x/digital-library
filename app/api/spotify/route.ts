import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PLAYLIST_ID = "41LuF5qeH9u3erSTc5LkPw";

export async function GET() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ tracks: [], noCredentials: true });
  }

  try {
    // Step 1: Get bearer token via Client Credentials flow
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      body: new URLSearchParams({ grant_type: "client_credentials" }),
    });

    if (!tokenRes.ok) {
      return NextResponse.json({ tracks: [], error: true });
    }

    const tokenData = (await tokenRes.json()) as { access_token: string };
    const accessToken = tokenData.access_token;

    // Step 2: Fetch playlist tracks
    const fields =
      "items(added_at,track(id,name,artists,album(images),external_urls,duration_ms))";
    const tracksRes = await fetch(
      `https://api.spotify.com/v1/playlists/${PLAYLIST_ID}/tracks?limit=100&fields=${encodeURIComponent(fields)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    if (!tracksRes.ok) {
      return NextResponse.json({ tracks: [], error: true });
    }

    const tracksData = (await tracksRes.json()) as { items: unknown[] };

    return NextResponse.json({ tracks: tracksData.items });
  } catch {
    return NextResponse.json({ tracks: [], error: true });
  }
}
