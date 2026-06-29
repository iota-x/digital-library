import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSession } from "@/lib/auth";
import { getCol } from "@/lib/mongo";
import { DEFAULT_SETTINGS } from "@/lib/themes";
import { DEFAULT_START_DATE } from "@/lib/relationship";
import { isPremiumCouple } from "@/lib/billing";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    let inviteCode:  string | null = null;
    let startDate                  = DEFAULT_START_DATE;
    let partnerName: string | null = null;
    let nickname:          string | null = null;
    let nicknameOn                       = false;
    let partnerNickname:   string | null = null;
    let partnerNicknameOn                = false;
    let avatarUrl:        string | null = null;
    let partnerAvatarUrl: string | null = null;
    let settings                   = DEFAULT_SETTINGS;
    let emailVerified              = true;
    // Premium entitlement. Defaults true (fail-open) so an un-configured paywall
    // or a missing couple never gates a real user's own features.
    let isPremium                 = true;
    // E2EE key material for the signed-in user. `keys` is what the client needs
    // to unlock the data key once it has the password (login/unlock); it's null
    // for accounts that predate encryption. `needsRegrant`/`hasRegrantBlob` drive
    // the partner re-grant recovery flow.
    let keys: Record<string, unknown> | null = null;
    let needsRegrant = false;
    let hasRegrantBlob = false;

    try {
      const users = await getCol("users");
      const me    = await users.findOne({ _id: new ObjectId(session.userId) });
      // Legacy accounts predate the flag — treat a missing value as verified
      // so only explicitly-unverified users are gated.
      emailVerified = me?.emailVerified !== false;

      if (me?.kdfSalt && (me?.wrappedCDK || me?.wrappedPrivateKey)) {
        keys = {
          kdfSalt: me.kdfSalt,
          wrappedCDK: me.wrappedCDK ?? null,
          wrappedPrivateKey: me.wrappedPrivateKey ?? null,
          recoverySalt: me.recoverySalt ?? null,
          recoveryWrappedCDK: me.recoveryWrappedCDK ?? null,
          recoveryWrappedPrivateKey: me.recoveryWrappedPrivateKey ?? null,
        };
      }
      needsRegrant = me?.needsRegrant === true;
      hasRegrantBlob = typeof me?.regrantBlob === "string";

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
        // A person's own nickname lives on their person slot (set by the other);
        // the partner's nickname lives on the partner's slot (set by this user).
        nickname          = (isCreator ? couple.person1Nickname   : couple.person2Nickname)   ?? null;
        nicknameOn        = (isCreator ? couple.person1NicknameOn : couple.person2NicknameOn) === true;
        partnerNickname   = (isCreator ? couple.person2Nickname   : couple.person1Nickname)   ?? null;
        partnerNicknameOn = (isCreator ? couple.person2NicknameOn : couple.person1NicknameOn) === true;
        avatarUrl        = (isCreator ? couple.person1Avatar  : couple.person2Avatar) ?? null;
        partnerAvatarUrl = (isCreator ? couple.person2Avatar  : couple.person1Avatar) ?? null;
        settings    = couple.settings ?? DEFAULT_SETTINGS;
        isPremium   = isPremiumCouple(couple);
      }
    } catch {}

    return NextResponse.json({
      ok: true,
      userId:      session.userId,
      coupleId:    session.coupleId,
      name:        session.name,
      role:        session.role,
      partnerName,
      nickname,
      nicknameOn,
      partnerNickname,
      partnerNicknameOn,
      avatarUrl,
      partnerAvatarUrl,
      inviteCode,
      startDate,
      settings,
      isPremium,
      emailVerified,
      keys,
      needsRegrant,
      hasRegrantBlob,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
