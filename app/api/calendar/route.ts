import { NextResponse } from "next/server";
import { getCol } from "@/lib/mongo";
import { broadcastCalendarUpdate } from "@/lib/sseBroadcast";
import { withAuth } from "@/lib/apiHandler";
import { READ_CACHE_HEADERS } from "@/lib/cacheHeaders";
import { serverEnv } from "@/lib/env";
import { fetchWeatherSnapshot } from "@/lib/weather";

/** Server's UTC date in YYYY-MM-DD (matches how entries are keyed). */
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export const GET = withAuth(async (_req, session) => {
  const col = await getCol("calendar");
  const entries = await col.find({ coupleId: session.coupleId }).toArray();
  return NextResponse.json(entries, { headers: READ_CACHE_HEADERS });
});

export const POST = withAuth(async (req, session) => {
  const body = await req.json();
  const { date, note, photos, photoStickers, reactions, special, specialLabel, mood, pinnedNote } = body;
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  const col = await getCol("calendar");
  // Read the existing entry to preserve any reactions we don't get a fresh
  // copy of — the dedicated /api/calendar/reaction endpoint may have updated
  // them since the client last loaded.
  const existing = await col.findOne({ date, coupleId: session.coupleId });

  // Per-day weather snapshot — captured once, the first time today's entry is
  // saved, then preserved forever (like reactions). Best-effort: needs home
  // coords configured and only fires for today's date so we read live weather.
  let weather = existing?.weather ?? null;
  if (!weather && date === todayKey()) {
    const lat = parseFloat(serverEnv.WEATHER_LAT);
    const lon = parseFloat(serverEnv.WEATHER_LON);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      weather = await fetchWeatherSnapshot(lat, lon, date);
    }
  }

  const doc = {
    date,
    coupleId: session.coupleId,
    note: note || "",
    photos: photos || [],
    photoStickers: photoStickers || {},
    reactions: reactions ?? existing?.reactions ?? {},
    special: !!special,
    specialLabel: specialLabel || "",
    mood: mood || "",
    pinnedNote: pinnedNote || "",
    weather,
  };
  await col.updateOne({ date, coupleId: session.coupleId }, { $set: doc }, { upsert: true });
  broadcastCalendarUpdate(session.coupleId, { type: "update", entry: doc });
  return NextResponse.json({ ok: true });
});

export const DELETE = withAuth(async (req, session) => {
  const { date } = await req.json();
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  const col = await getCol("calendar");
  await col.deleteOne({ date, coupleId: session.coupleId });
  broadcastCalendarUpdate(session.coupleId, { type: "delete", date });
  return NextResponse.json({ ok: true });
});
