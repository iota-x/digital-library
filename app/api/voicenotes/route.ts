import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCol } from "@/lib/mongo";
import { withAuth } from "@/lib/apiHandler";
import { broadcastToCouple } from "@/lib/sseBroadcast";
import { sendPushToCouple } from "@/lib/pushNotify";
import { READ_CACHE_HEADERS } from "@/lib/cacheHeaders";
import { senderDisplayName } from "@/lib/displayName";

export const GET = withAuth(async (_req, session) => {
  const col = await getCol("voicenotes");
  const docs = await col.find({ coupleId: session.coupleId }).sort({ createdAt: -1 }).toArray();
  return NextResponse.json(
    docs.map(d => ({ ...d, id: d._id.toString(), _id: undefined })),
    { headers: READ_CACHE_HEADERS },
  );
});

export const POST = withAuth(async (req, session) => {
  const { url, from, label } = await req.json();
  if (!url) return NextResponse.json({ error: "missing url" }, { status: 400 });

  const col = await getCol("voicenotes");
  const res = await col.insertOne({
    url,
    from: from || "",
    label: label || "",
    coupleId: session.coupleId,
    createdAt: new Date().toISOString(),
  });
  const sender = from || await senderDisplayName(session);
  broadcastToCouple(session.coupleId, { type: "voicenote:new", from: sender });
  sendPushToCouple(session.coupleId, {
    title: "new voice note 🎙",
    body: `${sender} left you a voice note`,
  });
  return NextResponse.json({ id: res.insertedId.toString() });
}, { rateLimit: { scope: "voicenotes:add", max: 30, windowMs: 60_000 } });

export const DELETE = withAuth(async (req, session) => {
  const { id } = await req.json();
  const col = await getCol("voicenotes");
  await col.deleteOne({ _id: new ObjectId(id), coupleId: session.coupleId });
  return NextResponse.json({ ok: true });
}, { rateLimit: { scope: "voicenotes:delete", max: 30, windowMs: 60_000 } });
