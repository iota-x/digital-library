import { NextResponse } from "next/server";
import type { Collection } from "mongodb";
import { getCol } from "@/lib/mongo";
import { withAuth } from "@/lib/apiHandler";
import { broadcastToCouple } from "@/lib/sseBroadcast";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { sendPushToOtherInCouple } from "@/lib/pushNotify";

/**
 * Shared doodle canvas — a tiny collaborative whiteboard per couple.
 *
 * One document per couple holds the last MAX_STROKES strokes so both
 * partners load the same picture and it survives a reload. Each completed
 * stroke is broadcast over SSE (`doodle:stroke`) so the partner sees lines
 * appear live; a clear wipes the doc and broadcasts `doodle:clear`.
 *
 * Strokes are sent on pointer-up (one full path), not per-point — reliable
 * on serverless and cheap on the rate limiter while still feeling live.
 */

const MAX_STROKES = 240;       // capped history kept per couple
const MAX_POINTS = 600;        // per stroke
const COLORS = new Set(["#be185d", "#7c3aed", "#0284c7", "#059669", "#d97706", "#1f2937", "#ffffff"]);

interface Point { x: number; y: number }
interface Stroke {
  id: string;
  color: string;
  size: number;
  points: Point[];
  userId: string;
  at: number;
}
interface DoodleDoc {
  coupleId: string;
  strokes: Stroke[];
  updatedAt: string;
}

/** The doodles collection, typed so $push/$slice on `strokes` checks out. */
async function doodleCol(): Promise<Collection<DoodleDoc>> {
  return (await getCol("doodles")) as unknown as Collection<DoodleDoc>;
}

function sanitizeStroke(raw: unknown, userId: string): Stroke | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const color = typeof r.color === "string" && COLORS.has(r.color) ? r.color : "#be185d";
  const size = typeof r.size === "number" && r.size > 0 ? Math.min(24, Math.max(1, r.size)) : 4;
  if (!Array.isArray(r.points) || r.points.length === 0) return null;
  const points: Point[] = [];
  for (const p of r.points.slice(0, MAX_POINTS)) {
    if (!p || typeof p !== "object") continue;
    const px = (p as Record<string, unknown>).x;
    const py = (p as Record<string, unknown>).y;
    if (typeof px !== "number" || typeof py !== "number") continue;
    if (!Number.isFinite(px) || !Number.isFinite(py)) continue;
    // Points are normalised to 0–1 of the canvas box; clamp defensively.
    points.push({ x: Math.min(1, Math.max(0, px)), y: Math.min(1, Math.max(0, py)) });
  }
  if (points.length === 0) return null;
  return {
    id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    color,
    size,
    points,
    userId,
    at: Date.now(),
  };
}

export const GET = withAuth(async (_req, session) => {
  const col = await doodleCol();
  const doc = await col.findOne({ coupleId: session.coupleId });
  const strokes = Array.isArray(doc?.strokes) ? doc.strokes : [];
  return NextResponse.json({ strokes });
});

export const POST = withAuth(async (req, session) => {
  const rl = await rateLimit(req, { scope: "doodle", max: 240, windowMs: 60_000, identifier: session.userId });
  if (!rl.ok) return tooManyRequests(rl.retryAfter, "slow down those lines ✏️");

  const body = await req.json().catch(() => ({}));
  const col = await doodleCol();

  // Nudge: ping the partner to come look at the doodle. No DB write — purely
  // a realtime + push notification ("come see what I drew").
  if (body?.nudge === true) {
    broadcastToCouple(session.coupleId, { type: "doodle:nudge", userId: session.userId, name: session.name });
    sendPushToOtherInCouple(session.coupleId, session.userId, {
      title: "a new doodle 🎨",
      body: `${session.name} drew you something — come see`,
    });
    return NextResponse.json({ ok: true });
  }

  if (body?.clear === true) {
    await col.updateOne(
      { coupleId: session.coupleId },
      { $set: { coupleId: session.coupleId, strokes: [], updatedAt: new Date().toISOString() } },
      { upsert: true },
    );
    broadcastToCouple(session.coupleId, { type: "doodle:clear", userId: session.userId });
    return NextResponse.json({ ok: true });
  }

  const stroke = sanitizeStroke(body?.stroke, session.userId);
  if (!stroke) return NextResponse.json({ error: "invalid stroke" }, { status: 400 });

  // Push the stroke and keep only the most recent MAX_STROKES.
  await col.updateOne(
    { coupleId: session.coupleId },
    {
      $set: { coupleId: session.coupleId, updatedAt: new Date().toISOString() },
      $push: { strokes: { $each: [stroke], $slice: -MAX_STROKES } },
    },
    { upsert: true },
  );

  broadcastToCouple(session.coupleId, { type: "doodle:stroke", userId: session.userId, stroke });
  return NextResponse.json({ ok: true, stroke });
});
