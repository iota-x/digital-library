import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCol } from "@/lib/mongo";

// GET — return only capsules whose unlockDate <= today
export async function GET() {
  try {
    const col   = await getCol("capsules");
    const today = new Date().toISOString().slice(0, 10);
    const docs  = await col
      .find({ unlockDate: { $lte: today } }, { projection: { _id: 1, letter: 1, unlockDate: 1, from: 1, createdAt: 1 } })
      .sort({ unlockDate: 1 })
      .toArray();

    // Stringify _id so it serialises cleanly
    const safe = docs.map(d => ({ ...d, id: d._id.toString(), _id: undefined }));
    return NextResponse.json(safe);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST — create a new capsule (letter stored encrypted-ish in DB, only returned after unlock date)
export async function POST(req: NextRequest) {
  try {
    const { letter, unlockDate, from } = await req.json();
    if (!letter || !unlockDate) return NextResponse.json({ error: "missing fields" }, { status: 400 });

    const col = await getCol("capsules");
    const res = await col.insertOne({
      letter,
      unlockDate,
      from: from || "",
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ id: res.insertedId.toString() });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE — remove a capsule by id
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    const col = await getCol("capsules");
    await col.deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}