import { NextResponse } from "next/server";
import { getCol } from "@/lib/mongo";
import { broadcastCalendarUpdate } from "@/lib/sseBroadcast";
import { sendPushToOtherInCouple } from "@/lib/pushNotify";
import { withAuth } from "@/lib/apiHandler";
import { READ_CACHE_HEADERS } from "@/lib/cacheHeaders";
import { serverEnv } from "@/lib/env";
import { fetchWeatherSnapshot } from "@/lib/weather";
import { v, parseBody, badRequest } from "@/lib/validate";
import { senderDisplayName } from "@/lib/displayName";
import { isPremiumCouple, loadCouple, FREE_PHOTO_CAP } from "@/lib/billing";

/** Server's UTC date in YYYY-MM-DD (matches how entries are keyed). */
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Simple, strict fields of a calendar entry. photoStickers/reactions are
 *  complex nested structures with server-side defaults/merging, so they're
 *  read from the raw body rather than schema-validated here. */
// Text fields arrive end-to-end encrypted, so these caps bound the *ciphertext*
// (≈ base64 of plaintext + IV/tag; up to ~6× a plaintext char for 4-byte emoji).
// The human-facing length limits are enforced on the client; these are generous
// abuse bounds that must never truncate a legitimately-encrypted value.
const CalendarBody = v.object({
  date: v.string({ pattern: ISO_DATE }),
  note: v.optional(v.string({ max: 120_000 })),
  photos: v.optional(v.array(v.string({ max: 2048 }), { max: 50 })),
  special: v.optional(v.boolean()),
  specialLabel: v.optional(v.string({ max: 2_000 })),
  mood: v.optional(v.string({ max: 1_000 })),
  pinnedNote: v.optional(v.string({ max: 16_000 })),
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

  // Premium gate: free couples have a total photo cap across all memories. Only
  // checked when this save *adds* photos (so editing notes / re-saving is never
  // blocked), and only when the couple isn't premium.
  const incomingPhotos = photos?.length ?? 0;
  if (incomingPhotos > (existing?.photos?.length ?? 0)) {
    const couple = await loadCouple(session.coupleId);
    if (!isPremiumCouple(couple)) {
      const agg = await col.aggregate<{ total: number }>([
        { $match: { coupleId: session.coupleId, date: { $ne: date } } },
        { $group: { _id: null, total: { $sum: { $size: { $ifNull: ["$photos", []] } } } } },
      ]).toArray();
      const otherTotal = agg[0]?.total ?? 0;
      if (otherTotal + incomingPhotos > FREE_PHOTO_CAP) {
        return NextResponse.json(
          { error: "premiumRequired", reason: "photo_cap", cap: FREE_PHOTO_CAP },
          { status: 402 },
        );
      }
    }
  }

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

  // Gentle nudge so the partner can come add on it or react. Fires on a
  // brand-new memory, and also when fresh content lands on an EXISTING day —
  // photos added, or a note written for the first time. Each case compares
  // against the pre-write `existing` doc, so routine re-saves/autosaves (which
  // change nothing new) never re-ping — and never the author themselves.
  const isNew = !existing;
  const hasContent = !!(doc.note || (doc.photos?.length ?? 0) > 0);
  const photosAdded = doc.photos.length - (existing?.photos?.length ?? 0);
  const noteJustWritten = !existing?.note && !!doc.note;
  if (isNew && hasContent) {
    const who = await senderDisplayName(session);
    broadcastCalendarUpdate(session.coupleId, {
      type: "memory:new", userId: session.userId, name: who, date,
    });
    sendPushToOtherInCouple(session.coupleId, session.userId, {
      title: `${who} added a memory 💗`,
      // The note is end-to-end encrypted — keep the push generic (no content).
      body: "a new moment for your journal",
    });
  } else if (!isNew && (photosAdded > 0 || noteJustWritten)) {
    const who = await senderDisplayName(session);
    broadcastCalendarUpdate(session.coupleId, {
      type: "memory:added", userId: session.userId, name: who, date,
    });
    sendPushToOtherInCouple(session.coupleId, session.userId, {
      title: `${who} added to your journal 💗`,
      body: photosAdded > 0
        ? `${photosAdded} new ${photosAdded === 1 ? "photo" : "photos"} on ${date} — come see & react`
        : `a new note on ${date} — come see & react`,
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
