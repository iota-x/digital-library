import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCol } from "@/lib/mongo";
import { getSession } from "@/lib/auth";
import { broadcastToCouple } from "@/lib/sseBroadcast";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const c = await getCol("bucketlist");
    const items = await c.find({ coupleId: session.coupleId }).sort({ addedAt: 1 }).toArray();
    return NextResponse.json(items.map(i => ({ ...i, _id: i._id.toString() })));
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

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
  } catch {
    return NextResponse.json({ error: "Failed to insert" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

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
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { _id } = await req.json() as { _id: string };
    if (!_id) return NextResponse.json({ error: "_id required" }, { status: 400 });

    const c = await getCol("bucketlist");
    await c.deleteOne({ _id: new ObjectId(_id), coupleId: session.coupleId });
    broadcastToCouple(session.coupleId, { type: "bucketlist:delete" });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
