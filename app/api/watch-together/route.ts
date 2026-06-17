import { NextResponse } from "next/server";
import { getCol } from "@/lib/mongo";
import { withAuth } from "@/lib/apiHandler";
import { broadcastToCouple } from "@/lib/sseBroadcast";
import { sendPushToOtherInCouple } from "@/lib/pushNotify";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";

/**
 * "Watch together" session — one active session per couple.
 *
 * Flow: one partner hits play on a title → the other gets a "join?" nudge →
 * both are marked watching. When done, each rates privately (1–10); the two
 * ratings reveal only once BOTH are in (server-gated, like the daily
 * question). Starting a different title resets the session.
 */
interface Participant { name: string; startedAt: string }
interface Rating { value: number; at: string }
interface SessionDoc {
  coupleId: string;
  itemId: string;
  title: string;
  participants: Record<string, Participant>;
  ratings: Record<string, Rating>;
  status: "watching" | "done";
  startedAt: string;
}

interface SessionView {
  active: boolean;
  itemId: string | null;
  title: string | null;
  status: "watching" | "done" | null;
  iAmIn: boolean;
  partnerIn: boolean;
  partnerName: string | null;
  startedByName: string | null;
  myRating: number | null;
  partnerRating: number | null;
  bothRated: boolean;
}

function viewFor(doc: SessionDoc | null, userId: string): SessionView {
  if (!doc?.itemId) {
    return {
      active: false, itemId: null, title: null, status: null,
      iAmIn: false, partnerIn: false, partnerName: null, startedByName: null,
      myRating: null, partnerRating: null, bothRated: false,
    };
  }
  const participants = doc.participants ?? {};
  const ratings = doc.ratings ?? {};
  const partnerUid = Object.keys(participants).find((uid) => uid !== userId) ?? null;
  const bothRated = Object.keys(ratings).length >= 2;
  // The "starter" is the earliest participant.
  const startedBy = Object.values(participants).sort((a, b) => a.startedAt.localeCompare(b.startedAt))[0];
  return {
    active: true,
    itemId: doc.itemId,
    title: doc.title,
    status: doc.status,
    iAmIn: !!participants[userId],
    partnerIn: !!partnerUid,
    partnerName: partnerUid ? participants[partnerUid].name : null,
    startedByName: startedBy?.name ?? null,
    myRating: ratings[userId]?.value ?? null,
    partnerRating: bothRated && partnerUid ? ratings[partnerUid]?.value ?? null : null,
    bothRated,
  };
}

export const GET = withAuth(async (_req, session) => {
  const col = await getCol("watchSessions");
  const doc = (await col.findOne({ coupleId: session.coupleId })) as SessionDoc | null;
  return NextResponse.json(viewFor(doc, session.userId));
});

export const POST = withAuth(async (req, session) => {
  const rl = await rateLimit(req, { scope: "watch-together", max: 40, windowMs: 60_000, identifier: session.userId });
  if (!rl.ok) return tooManyRequests(rl.retryAfter);

  const body = (await req.json().catch(() => ({}))) as {
    action?: string; itemId?: string; title?: string; value?: number;
  };
  const col = await getCol("watchSessions");
  const now = new Date().toISOString();
  const existing = (await col.findOne({ coupleId: session.coupleId })) as SessionDoc | null;

  switch (body.action) {
    case "start": {
      const itemId = (body.itemId || "").slice(0, 64);
      const title = (body.title || "").trim().slice(0, 200);
      if (!itemId || !title) return NextResponse.json({ error: "itemId and title required" }, { status: 400 });

      const sameItem = existing?.itemId === itemId;
      const participants = sameItem ? { ...(existing?.participants ?? {}) } : {};
      participants[session.userId] = { name: session.name, startedAt: now };

      const doc: SessionDoc = {
        coupleId: session.coupleId,
        itemId, title,
        participants,
        ratings: sameItem ? existing?.ratings ?? {} : {},
        status: "watching",
        startedAt: sameItem ? existing?.startedAt ?? now : now,
      };
      await col.updateOne({ coupleId: session.coupleId }, { $set: doc }, { upsert: true });

      broadcastToCouple(session.coupleId, { type: "watch:start", userId: session.userId, name: session.name, title, itemId });
      sendPushToOtherInCouple(session.coupleId, session.userId, {
        title: `${session.name} hit play 🍿`,
        body: `started "${title}" — join them?`,
      });
      return NextResponse.json(viewFor(doc, session.userId));
    }

    case "join": {
      if (!existing?.itemId) return NextResponse.json({ error: "no active session" }, { status: 400 });
      await col.updateOne(
        { coupleId: session.coupleId },
        { $set: { [`participants.${session.userId}`]: { name: session.name, startedAt: now } } },
      );
      const doc = (await col.findOne({ coupleId: session.coupleId })) as SessionDoc | null;
      broadcastToCouple(session.coupleId, { type: "watch:update", userId: session.userId, name: session.name });
      sendPushToOtherInCouple(session.coupleId, session.userId, {
        title: `${session.name} joined 🍿`,
        body: `you're watching "${existing.title}" together now`,
      });
      return NextResponse.json(viewFor(doc, session.userId));
    }

    case "rate": {
      if (!existing?.itemId) return NextResponse.json({ error: "no active session" }, { status: 400 });
      const value = Math.min(10, Math.max(1, Math.round(Number(body.value))));
      if (!Number.isFinite(value)) return NextResponse.json({ error: "invalid rating" }, { status: 400 });
      const hadMine = !!existing.ratings?.[session.userId];

      await col.updateOne(
        { coupleId: session.coupleId },
        { $set: { [`ratings.${session.userId}`]: { value, at: now } } },
      );
      const doc = (await col.findOne({ coupleId: session.coupleId })) as SessionDoc | null;
      const bothRated = Object.keys(doc?.ratings ?? {}).length >= 2;

      if (bothRated) {
        await col.updateOne({ coupleId: session.coupleId }, { $set: { status: "done" } });
        broadcastToCouple(session.coupleId, { type: "watch:reveal", userId: session.userId });
        if (!hadMine) sendPushToOtherInCouple(session.coupleId, session.userId, {
          title: "ratings are in 🎬",
          body: `see how you both rated "${existing.title}"`,
        });
      } else if (!hadMine) {
        broadcastToCouple(session.coupleId, { type: "watch:rated", userId: session.userId, name: session.name });
        sendPushToOtherInCouple(session.coupleId, session.userId, {
          title: `${session.name} rated it ⭐`,
          body: `drop yours to reveal both scores`,
        });
      }
      const fresh = (await col.findOne({ coupleId: session.coupleId })) as SessionDoc | null;
      return NextResponse.json(viewFor(fresh, session.userId));
    }

    case "end": {
      await col.deleteOne({ coupleId: session.coupleId });
      broadcastToCouple(session.coupleId, { type: "watch:end", userId: session.userId });
      return NextResponse.json(viewFor(null, session.userId));
    }

    default:
      return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }
});
