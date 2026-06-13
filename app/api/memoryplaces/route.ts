import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCol } from "@/lib/mongo";

export async function GET() {
  try {
    const col  = await getCol("memoryplaces");
    const docs = await col.find({}).sort({ addedAt: 1 }).toArray();
    return NextResponse.json(docs.map(d => ({ ...d, id: d._id.toString(), _id: undefined })));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { lat, lng, title, note, date } = await req.json();
    if (!lat || !lng || !title) return NextResponse.json({ error: "missing fields" }, { status: 400 });
    const col = await getCol("memoryplaces");
    const res = await col.insertOne({ lat, lng, title, note: note || "", date: date || "", addedAt: new Date().toISOString() });
    return NextResponse.json({ id: res.insertedId.toString() });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    const col = await getCol("memoryplaces");
    await col.deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
