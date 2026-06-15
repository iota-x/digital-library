import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCol } from "@/lib/mongo";
import { getSession } from "@/lib/auth";
import { broadcastToCouple } from "@/lib/sseBroadcast";
import { sendPushToCouple } from "@/lib/pushNotify";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const col = await getCol("voicenotes");
    const docs = await col.find({ coupleId: session.coupleId }).sort({ createdAt: -1 }).toArray();
    return NextResponse.json(docs.map(d => ({ ...d, id: d._id.toString(), _id: undefined })));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

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
    const sender = from || session.name;
    broadcastToCouple(session.coupleId, { type: "voicenote:new", from: sender });
    sendPushToCouple(session.coupleId, {
      title: "new voice note 🎙",
      body: `${sender} left you a voice note`,
    });
    return NextResponse.json({ id: res.insertedId.toString() });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { id } = await req.json();
    const col = await getCol("voicenotes");
    await col.deleteOne({ _id: new ObjectId(id), coupleId: session.coupleId });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
