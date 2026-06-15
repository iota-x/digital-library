import { NextRequest, NextResponse } from "next/server";
import { getCol } from "@/lib/mongo";
import { broadcastCalendarUpdate } from "@/lib/sseBroadcast";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const col = await getCol("calendar");
    const entries = await col.find({ coupleId: session.coupleId }).toArray();
    return NextResponse.json(entries);
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json();
    const { date, note, photos, special, specialLabel, mood, pinnedNote } = body;
    if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

    const col = await getCol("calendar");
    const doc = {
      date,
      coupleId: session.coupleId,
      note: note || "",
      photos: photos || [],
      special: !!special,
      specialLabel: specialLabel || "",
      mood: mood || "",
      pinnedNote: pinnedNote || "",
    };
    await col.updateOne({ date, coupleId: session.coupleId }, { $set: doc }, { upsert: true });
    broadcastCalendarUpdate(session.coupleId, { type: "update", entry: doc });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { date } = await req.json();
    if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

    const col = await getCol("calendar");
    await col.deleteOne({ date, coupleId: session.coupleId });
    broadcastCalendarUpdate(session.coupleId, { type: "delete", date });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
