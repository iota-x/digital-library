import { getCol } from "@/lib/mongo";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const col  = await getCol("calendar");
    const docs = await col.find({}, { projection: { _id: 0 } }).toArray();
    return NextResponse.json(docs);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const col  = await getCol("calendar");
    await col.updateOne({ date: body.date }, { $set: body }, { upsert: true });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { date } = await req.json();
    const col = await getCol("calendar");
    await col.deleteOne({ date });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }

}