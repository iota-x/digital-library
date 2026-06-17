import { NextResponse } from "next/server";
import { getCol } from "@/lib/mongo";
import { broadcastCalendarUpdate } from "@/lib/sseBroadcast";
import { sendPushToOtherInCouple } from "@/lib/pushNotify";
import { withAuth } from "@/lib/apiHandler";
import { READ_CACHE_HEADERS } from "@/lib/cacheHeaders";
import { serverEnv } from "@/lib/env";
import { fetchWeatherSnapshot } from "@/lib/weather";
import { v, parseBody, badRequest } from "@/lib/validate";

/** Server's UTC date in YYYY-MM-DD (matches how entries are keyed). */
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Simple, strict fields of a calendar entry. photoStickers/reactions are
 *  complex nested structures with server-side defaults/merging, so they're
 *  read from the raw body rather than schema-validated here. */
const CalendarBody = v.object({
  date: v.string({ pattern: ISO_DATE }),
  note: v.optional(v.string({ max: 20_000 })),
  photos: v.optional(v.array(v.string({ max: 2048 }), { max: 50 })),
  special: v.optional(v.boolean()),
  specialLabel: v.optional(v.string({ max: 200 })),
  mood: v.optional(v.string({ max: 60 })),
  pinnedNote: v.optional(v.string({ max: 2000 })),
});

export const GET = withAuth(async (_req, session) => {
  const col = await getCol("calendar");
  const entries = await col.find({ coupleId: session.coupleId }).toArray();
  return NextResponse.json(entries, { headers: READ_CACHE_HEADERS });
});

export const POST = withAuth(async (req, session) => {
  const body = await req.json().catch(() => null);
  const parsed = CalendarBody(body);
  if (!parsed.ok) return badRequest(parsed.error);
  const { date, note, photos, special, specialLabel, mood, pinnedNote } = parsed.value;
  // Complex nested structures, read raw (defaulted/merged below).
  const { photoStickers, reactions } = (body ?? {}) as {
    photoStickers?: Record<string, unknown>;
    reactions?: Record<string, string[]>;
  };

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

  // Gentle nudge: when a brand-new memory with real content is added, ping the
  // partner. Only on first creation (no prior doc) so routine edits/autosaves
  // don't spam — and never the author themselves.
  const isNew = !existing;
  const hasContent = !!(doc.note || (doc.photos?.length ?? 0) > 0);
  if (isNew && hasContent) {
    broadcastCalendarUpdate(session.coupleId, {
      type: "memory:new", userId: session.userId, name: session.name, date,
    });
    sendPushToOtherInCouple(session.coupleId, session.userId, {
      title: `${session.name} added a memory 💗`,
      body: doc.note ? doc.note.slice(0, 80) : "a new moment for your journal",
    });
  }
  return NextResponse.json({ ok: true });
}, { rateLimit: { scope: "calendar:write", max: 120, windowMs: 60_000 } });

export const DELETE = withAuth(async (req, session) => {
  const { date } = await req.json();
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  const col = await getCol("calendar");
  await col.deleteOne({ date, coupleId: session.coupleId });
  broadcastCalendarUpdate(session.coupleId, { type: "delete", date });
  return NextResponse.json({ ok: true });
}, { rateLimit: { scope: "calendar:delete", max: 60, windowMs: 60_000 } });
