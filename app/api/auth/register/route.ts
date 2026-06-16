import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCol } from "@/lib/mongo";
import { signSession, setSessionCookie } from "@/lib/auth";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { generateOtp, storeOtp, sendMail, verifyEmailTemplate } from "@/lib/email";

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

const DATA_COLLECTIONS = ["calendar", "capsules", "voicenotes", "bucketlist", "watchlist"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP — 3 register attempts per hour
    const rl = rateLimit(req, { scope: "auth:register", max: 3, windowMs: 60 * 60_000 });
    if (!rl.ok) return tooManyRequests(rl.retryAfter, "Too many sign-up attempts. Try again later.");

    const body = await req.json();
    const { name, email, password, startDate } = body as {
      name?: string;
      email?: string;
      password?: string;
      startDate?: string;
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

    const couples = await getCol("couples");
    const coupleResult = await couples.insertOne({
      inviteCode,
      person1Name: name.trim(),
      person1Email: emailLower,
      startDate,
      createdAt: new Date().toISOString(),
    });
    const coupleId = coupleResult.insertedId.toString();

    const passwordHash = await bcrypt.hash(password, 12);
    const userResult = await users.insertOne({
      name: name.trim(),
      email: emailLower,
      passwordHash,
      coupleId,
      role: "creator" as const,
      emailVerified: false,
      createdAt: new Date().toISOString(),
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
