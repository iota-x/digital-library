import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCol } from "@/lib/mongo";
import { signSession, setSessionCookie } from "@/lib/auth";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { generateOtp, storeOtp, sendMail, verifyEmailTemplate } from "@/lib/email";
import { sendPushToCouple } from "@/lib/pushNotify";
import { REWARD_THEMES } from "@/lib/themes";
import { pickUserCrypto } from "@/lib/cryptoServer";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function getUniqueInviteCode(): Promise<string> {
  const couples = await getCol("couples");
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateInviteCode();
    const existing = await couples.findOne({ inviteCode: code });
    if (!existing) return code;
  }
  throw new Error("Could not generate unique invite code");
}

// Referral codes are longer (8 chars) so they never collide with 6-char invite
// codes and are easy to share in a link.
function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function getUniqueReferralCode(): Promise<string> {
  const couples = await getCol("couples");
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateReferralCode();
    const existing = await couples.findOne({ referralCode: code });
    if (!existing) return code;
  }
  // Non-fatal: fall back to a timestamp-suffixed code rather than blocking signup
  return generateReferralCode() + Date.now().toString(36).slice(-3).toUpperCase();
}

const DATA_COLLECTIONS = ["calendar", "capsules", "voicenotes", "bucketlist", "watchlist"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP — 3 register attempts per hour
    const rl = await rateLimit(req, { scope: "auth:register", max: 3, windowMs: 60 * 60_000 });
    if (!rl.ok) return tooManyRequests(rl.retryAfter, "Too many sign-up attempts. Try again later.");

    const body = await req.json();
    const { name, email, password, startDate, ref, crypto } = body as {
      name?: string;
      email?: string;
      password?: string;
      startDate?: string;
      ref?: string;
      // E2EE key material generated on the client (opaque blobs — the server
      // never derives a key or reads content). Optional so the route stays
      // backward-compatible; content encryption activates once keys exist.
      crypto?: unknown;
    };

    if (!name?.trim() || !email?.trim() || !password || !startDate) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }
    if (!EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ error: "Please enter a valid email" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const emailLower = email.trim().toLowerCase();
    const users = await getCol("users");

    const existingUser = await users.findOne({ email: emailLower });
    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const inviteCode = await getUniqueInviteCode();
    const referralCode = await getUniqueReferralCode();

    const couples = await getCol("couples");
    const coupleResult = await couples.insertOne({
      inviteCode,
      referralCode,
      referralCount: 0,
      person1Name: name.trim(),
      person1Email: emailLower,
      startDate,
      createdAt: new Date().toISOString(),
    });
    const coupleId = coupleResult.insertedId.toString();

    // Referral attribution — fully optional and isolated so a bad/expired code
    // can never fail a signup. Credits the referrer and stamps this couple.
    if (ref && typeof ref === "string") {
      try {
        const refCode = ref.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 12);
        if (refCode && refCode !== referralCode) {
          const referrer = await couples.findOne({ referralCode: refCode });
          if (referrer && referrer._id.toString() !== coupleId) {
            const updated = await couples.findOneAndUpdate(
              { _id: referrer._id },
              { $inc: { referralCount: 1 } },
              { returnDocument: "after" },
            );
            await couples.updateOne(
              { _id: coupleResult.insertedId },
              { $set: { referredBy: referrer._id.toString(), referredAt: new Date().toISOString() } },
            );
            // Close the reward loop: tell the referrer it landed, and celebrate
            // loudly when this referral crosses a theme-unlock threshold.
            const newCount = (updated?.referralCount as number | undefined) ?? 0;
            const unlocked = REWARD_THEMES.find(t => t.unlockAt === newCount);
            void sendPushToCouple(referrer._id.toString(), unlocked
              ? { title: `you unlocked ${unlocked.emoji} ${unlocked.name}!`, body: "a couple you invited just joined — your reward theme is ready in settings 💝" }
              : { title: "a couple you invited just joined 💗", body: "thank you for spreading the love" });
          }
        }
      } catch (e) {
        console.error("Referral attribution failed (non-fatal):", e);
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userResult = await users.insertOne({
      name: name.trim(),
      email: emailLower,
      passwordHash,
      coupleId,
      role: "creator" as const,
      emailVerified: false,
      createdAt: new Date().toISOString(),
      ...pickUserCrypto(crypto),
    });
    const userId = userResult.insertedId.toString();

    // Migration: if first couple, attach any unowned existing data
    const coupleCount = await couples.countDocuments();
    if (coupleCount === 1) {
      for (const collName of DATA_COLLECTIONS) {
        try {
          const col = await getCol(collName);
          await col.updateMany({ coupleId: { $exists: false } }, { $set: { coupleId } });
        } catch {}
      }
    }

    // Issue + email a 6-digit verification code
    const code = generateOtp();
    await storeOtp(emailLower, "verify-email", code, 15);
    sendMail(emailLower, "Your verification code", verifyEmailTemplate(code)).catch(console.error);

    // Sign session so the user can immediately enter the verify-code screen
    // (but their account is flagged emailVerified:false until they confirm)
    const token = await signSession({ userId, coupleId, name: name.trim(), role: "creator" });
    const res = NextResponse.json({ ok: true, inviteCode, requiresVerification: true });
    setSessionCookie(res, token);
    return res;
  } catch (e) {
    console.error("Register error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
