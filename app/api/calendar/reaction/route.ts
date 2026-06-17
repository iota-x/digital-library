import { NextResponse } from "next/server";
import { getCol } from "@/lib/mongo";
import { withAuth } from "@/lib/apiHandler";
import { broadcastCalendarUpdate } from "@/lib/sseBroadcast";
import { sendPushToOtherInCouple } from "@/lib/pushNotify";

/**
 * Toggle a reaction on a calendar entry.
 *
 * Body: { date: "YYYY-MM-DD", emoji: "🩷" }
 *
 * If the current user has already reacted with this emoji, the reaction is
 * removed. Otherwise it's added. Broadcasts the new entry on SSE so the
 * partner's UI updates without a refetch. Fires a push only when the
 * reaction is being added (not on un-react).
 */
const ALLOWED = new Set(["🩷", "🥺", "✨", "🌷", "😘", "🥰", "👀", "💌"]);

export const POST = withAuth(async (req, session) => {
  const { date, emoji } = await req.json() as { date?: string; emoji?: string };
  if (!date || !emoji) return NextResponse.json({ error: "date and emoji required" }, { status: 400 });
  if (!ALLOWED.has(emoji)) return NextResponse.json({ error: "emoji not allowed" }, { status: 400 });

  const col = await getCol("calendar");
  const entry = await col.findOne({ date, coupleId: session.coupleId });
  const reactions: Record<string, string[]> = entry?.reactions ?? {};
  const list = Array.isArray(reactions[emoji]) ? [...reactions[emoji]] : [];
  const had = list.includes(session.userId);
  let nextList: string[];
  if (had) nextList = list.filter(id => id !== session.userId);
  else     nextList = [...list, session.userId];

  const nextReactions: Record<string, string[]> = { ...reactions };
  if (nextList.length === 0) delete nextReactions[emoji];
  else                       nextReactions[emoji] = nextList;

  await col.updateOne(
    { date, coupleId: session.coupleId },
    { $set: { reactions: nextReactions, date, coupleId: session.coupleId } },
    { upsert: true },
  );

  const refreshed = await col.findOne({ date, coupleId: session.coupleId });
  if (refreshed) {
    // Avoid leaking _id back through the stream
    const { _id, ...payload } = refreshed;
    void _id;
    broadcastCalendarUpdate(session.coupleId, { type: "update", entry: payload });
  }

  // Only notify on add — un-reacting shouldn't ping. Skip the sender so
  // you don't get a push for your own reaction.
  if (!had) {
    // Dedicated lightweight nudge event for an in-app toast (the calendar
    // entry update above already syncs the data; this drives the "Juhi
    // reacted 🩷 to June 3" toast for whoever has the app open).
    broadcastCalendarUpdate(session.coupleId, {
      type: "reaction:nudge",
      userId: session.userId,
      name: session.name,
      emoji,
      date,
    });
    sendPushToOtherInCouple(session.coupleId, session.userId, {
      title: `${session.name} reacted ${emoji}`,
      body: `to your memory from ${date}`,
    });
  }

  return NextResponse.json({ ok: true, added: !had, reactions: nextReactions });
});
