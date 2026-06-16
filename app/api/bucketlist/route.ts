import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCol } from "@/lib/mongo";
import { withAuth } from "@/lib/apiHandler";
import { broadcastToCouple } from "@/lib/sseBroadcast";
import { READ_CACHE_HEADERS } from "@/lib/cacheHeaders";

export const GET = withAuth(async (_req, session) => {
  const c = await getCol("bucketlist");
  const items = await c.find({ coupleId: session.coupleId }).sort({ addedAt: 1 }).toArray();
  return NextResponse.json(items.map(i => ({ ...i, _id: i._id.toString() })), { headers: READ_CACHE_HEADERS });
});

export const POST = withAuth(async (req, session) => {
  const { text, category } = await req.json() as { text: string; category: string };
  if (!text?.trim()) return NextResponse.json({ error: "text required" }, { status: 400 });

  const c = await getCol("bucketlist");
  const result = await c.insertOne({
    text: text.trim(),
    category: category || "other",
    completed: false,
    coupleId: session.coupleId,
    addedAt: new Date().toISOString(),
  });
  broadcastToCouple(session.coupleId, { type: "bucketlist:add" });
  return NextResponse.json({ ok: true, _id: result.insertedId.toString() }, { status: 201 });
});

export const PUT = withAuth(async (req, session) => {
  const body = await req.json() as { _id: string; completed?: boolean; text?: string; category?: string };
  const { _id, ...fields } = body;
  if (!_id) return NextResponse.json({ error: "_id required" }, { status: 400 });

  const update: Record<string, unknown> = { ...fields };
  if (fields.completed === true)  update.completedAt = new Date().toISOString();
  if (fields.completed === false) update.completedAt = null;

  const c = await getCol("bucketlist");
  await c.updateOne({ _id: new ObjectId(_id), coupleId: session.coupleId }, { $set: update });
  broadcastToCouple(session.coupleId, { type: "bucketlist:update" });
  return NextResponse.json({ ok: true });
});

export const DELETE = withAuth(async (req, session) => {
  const { _id } = await req.json() as { _id: string };
  if (!_id) return NextResponse.json({ error: "_id required" }, { status: 400 });

  const c = await getCol("bucketlist");
  await c.deleteOne({ _id: new ObjectId(_id), coupleId: session.coupleId });
  broadcastToCouple(session.coupleId, { type: "bucketlist:delete" });
  return NextResponse.json({ ok: true });
});
