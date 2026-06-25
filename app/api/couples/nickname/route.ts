import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCol } from "@/lib/mongo";
import { withAuth } from "@/lib/apiHandler";
import { broadcastToCouple } from "@/lib/sseBroadcast";
import { v, parseBody, badRequest } from "@/lib/validate";

/**
 * Set the nickname the signed-in user gives their *partner* — an affectionate
 * name shown in place of the partner's given name across the app (for both
 * people) when `on` is true.
 *
 * Nicknames live on the couple document next to the names: a person's nickname
 * sits on THEIR slot (person1/person2) but is authored by the other partner.
 * So the creator writes person2Nickname and the partner writes person1Nickname.
 * `on` is stored separately from the text so a user can switch back to the
 * given name without losing the nickname they typed.
 *
 * Broadcasts `nickname:update` so the other person's app reflects the change
 * live (it changes how they see themselves, too).
 */
const NicknameBody = v.object({
  // Trimmed display string, or "" to clear. Kept short — it's a pet name.
  nickname: v.string({ max: 40, trim: true }),
  on: v.boolean(),
});

export const PUT = withAuth(
  async (req, session) => {
    const parsed = await parseBody(req, NicknameBody);
    if (!parsed.ok) return badRequest(parsed.error);
    const nickname = parsed.value.nickname;
    // No nickname text means nothing to switch on.
    const on = nickname ? parsed.value.on : false;

    // The partner's slot is the opposite of the signed-in user's.
    const target = session.role === "creator" ? "person2" : "person1";
    const col = await getCol("couples");
    await col.updateOne(
      { _id: new ObjectId(session.coupleId) },
      { $set: { [`${target}Nickname`]: nickname, [`${target}NicknameOn`]: on } },
    );

    broadcastToCouple(session.coupleId, {
      type: "nickname:update",
      userId: session.userId,
      target,
      nickname,
      on,
    });
    return NextResponse.json({ ok: true, nickname, on });
  },
  { rateLimit: { scope: "couples:nickname", max: 30, windowMs: 60_000 } },
);
