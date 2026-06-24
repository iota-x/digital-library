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
    let avatarUrl:        string | null = null;
    let partnerAvatarUrl: string | null = null;
    let settings                   = DEFAULT_SETTINGS;
    let emailVerified              = true;

    try {
      const users = await getCol("users");
      const me    = await users.findOne({ _id: new ObjectId(session.userId) });
      // Legacy accounts predate the flag — treat a missing value as verified
      // so only explicitly-unverified users are gated.
      emailVerified = me?.emailVerified !== false;

      // Debounced last-seen stamp powers the admin DAU/returning-user view.
      // /me is hit on every app load, so only write when the stored value is
      // stale (>5 min) — keeps this read endpoint from writing on every request.
      const now = Date.now();
      const last = me?.lastSeenAt ? Date.parse(me.lastSeenAt) : 0;
      if (!last || now - last > 5 * 60_000) {
        void users.updateOne(
          { _id: new ObjectId(session.userId) },
          { $set: { lastSeenAt: new Date(now).toISOString() } },
        );
      }
    } catch {}

    try {
      const couples = await getCol("couples");
      const couple  = await couples.findOne({ _id: new ObjectId(session.coupleId) });
      if (couple) {
        inviteCode  = couple.inviteCode ?? null;
        startDate   = couple.startDate  ?? DEFAULT_START_DATE;
        const isCreator = session.role === "creator";
        partnerName      = (isCreator ? couple.person2Name   : couple.person1Name)   ?? null;
        avatarUrl        = (isCreator ? couple.person1Avatar  : couple.person2Avatar) ?? null;
        partnerAvatarUrl = (isCreator ? couple.person2Avatar  : couple.person1Avatar) ?? null;
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
      avatarUrl,
      partnerAvatarUrl,
      inviteCode,
      startDate,
      settings,
      emailVerified,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
