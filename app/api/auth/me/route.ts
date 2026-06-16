import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSession } from "@/lib/auth";
import { getCol } from "@/lib/mongo";
import { DEFAULT_SETTINGS } from "@/lib/themes";
import { DEFAULT_START_DATE } from "@/lib/relationship";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    let inviteCode:  string | null = null;
    let startDate                  = DEFAULT_START_DATE;
    let partnerName: string | null = null;
    let settings                   = DEFAULT_SETTINGS;

    try {
      const couples = await getCol("couples");
      const couple  = await couples.findOne({ _id: new ObjectId(session.coupleId) });
      if (couple) {
        inviteCode  = couple.inviteCode ?? null;
        startDate   = couple.startDate  ?? DEFAULT_START_DATE;
        partnerName = session.role === "creator" ? couple.person2Name ?? null : couple.person1Name ?? null;
        settings    = couple.settings ?? DEFAULT_SETTINGS;
      }
    } catch {}

    return NextResponse.json({
      ok: true,
      userId:      session.userId,
      coupleId:    session.coupleId,
      name:        session.name,
      role:        session.role,
      partnerName,
      inviteCode,
      startDate,
      settings,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
