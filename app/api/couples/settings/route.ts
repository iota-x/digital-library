import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCol } from "@/lib/mongo";
import { withAuth } from "@/lib/apiHandler";
import { DEFAULT_SETTINGS, type CoupleSettings } from "@/lib/themes";

export const GET = withAuth(async (_req, session) => {
  const col    = await getCol("couples");
  const couple = await col.findOne({ _id: new ObjectId(session.coupleId) });
  return NextResponse.json({ ok: true, settings: couple?.settings ?? DEFAULT_SETTINGS });
});

export const PUT = withAuth(async (req, session) => {
  const { settings, startDate } = await req.json() as { settings: CoupleSettings; startDate?: string };
  const patch: Record<string, unknown> = { settings };
  if (startDate) patch.startDate = startDate;
  const col = await getCol("couples");
  await col.updateOne({ _id: new ObjectId(session.coupleId) }, { $set: patch });
  return NextResponse.json({ ok: true });
});
