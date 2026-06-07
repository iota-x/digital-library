import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const URI = "mongodb+srv://iota_x:database808@cluster0.zf8rd7n.mongodb.net/";
const DB  = "anniversary";
const COL = "calendar";

let client: MongoClient | null = null;

async function getCol() {
  if (!client) { client = new MongoClient(URI); await client.connect(); }
  return client.db(DB).collection(COL);
}

export async function GET() {
  try {
    const col  = await getCol();
    const docs = await col.find({}, { projection: { _id: 0 } }).toArray();
    return NextResponse.json(docs);
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const col  = await getCol();
    await col.updateOne({ date: body.date }, { $set: body }, { upsert: true });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function DELETE(req: NextRequest) {
  try {
    const { date } = await req.json();
    const col = await getCol();
    await col.deleteOne({ date });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}