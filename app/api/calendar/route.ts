import { NextResponse } from "next/server";
import { getCol } from "@/lib/mongo";
import { broadcastCalendarUpdate } from "@/lib/sseBroadcast";
import { withAuth } from "@/lib/apiHandler";
import { READ_CACHE_HEADERS } from "@/lib/cacheHeaders";

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
