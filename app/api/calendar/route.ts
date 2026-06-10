import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { broadcastCalendarUpdate } from "@/lib/sseBroadcast";

declare global { var _mongoClientPromise: Promise<MongoClient> | undefined; }
if (!global._mongoClientPromise) {
  global._mongoClientPromise = new MongoClient(process.env.MONGODB_URI!).connect();
}
const clientPromise = global._mongoClientPromise;

async function getCollection() {
  const c = await clientPromise;
  return c.db("anniversary").collection("calendar");
}

export async function GET() {
  try {
    const col = await getCollection();
    const entries = await col.find({}).toArray();
    return NextResponse.json(entries);
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, note, photos, special, specialLabel, mood, pinnedNote } = body;
    if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });
    const col = await getCollection();
    const doc = {
      date,
      note: note || "",
      photos: photos || [],
      special: !!special,
      specialLabel: specialLabel || "",
      mood: mood || "",
      pinnedNote: pinnedNote || "",
    };
    await col.updateOne({ date }, { $set: doc }, { upsert: true });
    broadcastCalendarUpdate({ type: "update", entry: doc });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { date } = await req.json();
    if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });
    const col = await getCollection();
    await col.deleteOne({ date });
    broadcastCalendarUpdate({ type: "delete", date });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}