import { NextRequest, NextResponse } from "next/server";
import { getCol } from "@/lib/mongo";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";

// GET ?code=ABC123 — PUBLIC (no auth): the joining partner isn't signed in yet.
// Returns just enough to make the invite landing warm and personal — the
// inviter's first name + their note — without leaking anything sensitive.
// IP rate-limited so it can't be used to enumerate codes.
export async function GET(req: NextRequest) {
  const rl = await rateLimit(req, { scope: "invite:info", max: 30, windowMs: 10 * 60_000 });
  if (!rl.ok) return tooManyRequests(rl.retryAfter);

  const code = (new URL(req.url).searchParams.get("code") || "").trim();
  if (!code || !/^[A-Za-z0-9]{4,10}$/.test(code)) {
    return NextResponse.json({ ok: false, valid: false });
  }

  const couples = await getCol("couples");
  const couple = await couples.findOne(
    { inviteCode: { $regex: new RegExp(`^${code}$`, "i") } },
    { projection: { person1Name: 1, person2Email: 1, inviteNote: 1 } },
  );

  if (!couple) return NextResponse.json({ ok: true, valid: false });

  return NextResponse.json({
    ok: true,
    valid: true,
    alreadyJoined: !!couple.person2Email,
    inviterName: typeof couple.person1Name === "string" ? couple.person1Name : null,
    note: typeof couple.inviteNote === "string" && couple.inviteNote.trim() ? couple.inviteNote : null,
  });
}
