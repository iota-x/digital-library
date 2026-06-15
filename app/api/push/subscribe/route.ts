import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCol } from "@/lib/mongo";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const subscription = await req.json();
    const col = await getCol("pushSubscriptions");
    await col.updateOne(
      { userId: session.userId },
      { $set: { userId: session.userId, coupleId: session.coupleId, subscription, updatedAt: new Date() } },
      { upsert: true }
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const col = await getCol("pushSubscriptions");
    await col.deleteOne({ userId: session.userId });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
