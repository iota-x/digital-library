import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCol } from "@/lib/mongo";

const col = () => getCol("bucketlist");

export async function GET() {
  try {
    const c = await col();
    const items = await c.find({}).sort({ addedAt: 1 }).toArray();
    return NextResponse.json(items.map(i => ({ ...i, _id: i._id.toString() })));
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { text, category } = await req.json() as { text: string; category: string };
    if (!text?.trim()) return NextResponse.json({ error: "text required" }, { status: 400 });
    const c = await col();
    const result = await c.insertOne({
      text: text.trim(),
      category: category || "other",
      completed: false,
      addedAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, _id: result.insertedId.toString() }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to insert" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json() as { _id: string; completed?: boolean; text?: string; category?: string };
    const { _id, ...fields } = body;
    if (!_id) return NextResponse.json({ error: "_id required" }, { status: 400 });
    const update: Record<string, unknown> = { ...fields };
    if (fields.completed === true)  update.completedAt = new Date().toISOString();
    if (fields.completed === false) update.completedAt = null;
    const c = await col();
    await c.updateOne({ _id: new ObjectId(_id) }, { $set: update });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { _id } = await req.json() as { _id: string };
    if (!_id) return NextResponse.json({ error: "_id required" }, { status: 400 });
    const c = await col();
    await c.deleteOne({ _id: new ObjectId(_id) });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
