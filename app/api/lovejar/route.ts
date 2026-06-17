import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCol } from "@/lib/mongo";
import { withAuth } from "@/lib/apiHandler";
import { broadcastToCouple } from "@/lib/sseBroadcast";
import { sendPushToOtherInCouple } from "@/lib/pushNotify";
import { READ_CACHE_HEADERS } from "@/lib/cacheHeaders";

/**
 * "Reasons I love you" jar — each partner drops in notes; either can draw one
 * at random later. One document per note, scoped to the couple.
 */
export const GET = withAuth(async (_req, session) => {
  const c = await getCol("loveJar");
  const notes = await c.find({ coupleId: session.coupleId }).sort({ addedAt: -1 }).toArray();
  return NextResponse.json(
    notes.map((n) => ({ _id: n._id.toString(), text: n.text, from: n.from, addedAt: n.addedAt })),
    { headers: READ_CACHE_HEADERS },
  );
});

export const POST = withAuth(async (req, session) => {
  const { text } = (await req.json().catch(() => ({}))) as { text?: string };
  const clean = (text ?? "").trim().slice(0, 500);
  if (!clean) return NextResponse.json({ error: "text required" }, { status: 400 });

  const c = await getCol("loveJar");
  const addedAt = new Date().toISOString();
  const result = await c.insertOne({ coupleId: session.coupleId, text: clean, from: session.name, addedAt });

  broadcastToCouple(session.coupleId, { type: "lovejar:add", userId: session.userId });
  sendPushToOtherInCouple(session.coupleId, session.userId, {
    title: "a new reason in the jar 🫙💗",
    body: `${session.name} added a reason they love you — open the jar to find it`,
  });
  return NextResponse.json({ _id: result.insertedId.toString(), text: clean, from: session.name, addedAt }, { status: 201 });
}, { rateLimit: { scope: "lovejar:add", max: 60, windowMs: 60_000 } });

export const DELETE = withAuth(async (req, session) => {
  const { _id } = (await req.json().catch(() => ({}))) as { _id?: string };
  if (!_id || !ObjectId.isValid(_id)) return NextResponse.json({ error: "_id required" }, { status: 400 });

  const c = await getCol("loveJar");
  await c.deleteOne({ _id: new ObjectId(_id), coupleId: session.coupleId });
  broadcastToCouple(session.coupleId, { type: "lovejar:delete", userId: session.userId });
  return NextResponse.json({ ok: true });
}, { rateLimit: { scope: "lovejar:delete", max: 60, windowMs: 60_000 } });
