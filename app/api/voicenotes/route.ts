import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCol } from "@/lib/mongo";

export async function GET() {
  try {
    const col  = await getCol("voicenotes");
    const docs = await col.find({}).sort({ createdAt: -1 }).toArray();
    return NextResponse.json(docs.map(d => ({ ...d, id: d._id.toString(), _id: undefined })));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url, from, label } = await req.json();
    if (!url) return NextResponse.json({ error: "missing url" }, { status: 400 });
    const col = await getCol("voicenotes");
    const res = await col.insertOne({ url, from: from || "", label: label || "", createdAt: new Date().toISOString() });
    return NextResponse.json({ id: res.insertedId.toString() });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    const col = await getCol("voicenotes");
    await col.deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
