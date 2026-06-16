import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSession } from "@/lib/auth";
import { getCol } from "@/lib/mongo";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  return code;
}

async function uniqueCode(couples: Awaited<ReturnType<typeof getCol>>): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = generateInviteCode();
    if (!(await couples.findOne({ inviteCode: code }))) return code;
  }
  throw new Error("Could not generate unique invite code");
}

// POST — rotate the couple's invite code. Only the creator may rotate.
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    // 3 rotations per hour per user is plenty for typos / leaks
    const rl = rateLimit(req, { scope: "invite:rotate", max: 3, windowMs: 60 * 60_000, identifier: session.userId });
    if (!rl.ok) return tooManyRequests(rl.retryAfter, "Wait a bit before rotating again.");

    if (session.role !== "creator") {
      return NextResponse.json({ error: "Only the account creator can rotate the invite code." }, { status: 403 });
    }

    const couples = await getCol("couples");
    const couple = await couples.findOne({ _id: new ObjectId(session.coupleId) });
    if (!couple) return NextResponse.json({ error: "Couple not found" }, { status: 404 });

    // If the partner has already joined, there's no useful purpose to rotating
    if (couple.person2Email) {
      return NextResponse.json({ error: "Partner has already joined — invite code is no longer needed." }, { status: 409 });
    }

    const newCode = await uniqueCode(couples);
    await couples.updateOne({ _id: couple._id }, { $set: { inviteCode: newCode } });
    return NextResponse.json({ ok: true, inviteCode: newCode });
  } catch (e) {
    console.error("Invite rotate error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
