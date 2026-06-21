import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCol } from "@/lib/mongo";
import { withAuth } from "@/lib/apiHandler";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateReferralCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  return code;
}

async function uniqueReferralCode(couples: Awaited<ReturnType<typeof getCol>>): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = generateReferralCode();
    if (!(await couples.findOne({ referralCode: code }))) return code;
  }
  return generateReferralCode() + Date.now().toString(36).slice(-3).toUpperCase();
}

// GET — the couple's referral code + how many couples they've brought in.
// Lazily backfills a referral code for couples created before referrals existed.
export const GET = withAuth(async (_req, session) => {
  const couples = await getCol("couples");
  const couple = await couples.findOne({ _id: new ObjectId(session.coupleId) });
  if (!couple) return NextResponse.json({ error: "Couple not found" }, { status: 404 });

  let referralCode: string | undefined = couple.referralCode;
  if (!referralCode) {
    referralCode = await uniqueReferralCode(couples);
    await couples.updateOne(
      { _id: couple._id },
      { $set: { referralCode, referralCount: couple.referralCount ?? 0 } },
    );
  }

  return NextResponse.json({
    referralCode,
    referralCount: couple.referralCount ?? 0,
  });
});
