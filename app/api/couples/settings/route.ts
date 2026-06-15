import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSession } from "@/lib/auth";
import { getCol } from "@/lib/mongo";
import { DEFAULT_SETTINGS, type CoupleSettings } from "@/lib/themes";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const col    = await getCol("couples");
    const couple = await col.findOne({ _id: new ObjectId(session.coupleId) });
    return NextResponse.json({ ok: true, settings: couple?.settings ?? DEFAULT_SETTINGS });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const { settings, startDate } = await req.json() as { settings: CoupleSettings; startDate?: string };
    const patch: Record<string, unknown> = { settings };
    if (startDate) patch.startDate = startDate;
    const col = await getCol("couples");
    await col.updateOne({ _id: new ObjectId(session.coupleId) }, { $set: patch });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
