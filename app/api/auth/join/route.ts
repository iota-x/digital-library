import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCol } from "@/lib/mongo";
import { signSession, setSessionCookie } from "@/lib/auth";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { generateOtp, storeOtp, sendMail, verifyEmailTemplate } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP — invite codes are 6-char so brute-force needs heavy throttle
    const rl = await rateLimit(req, { scope: "auth:join", max: 10, windowMs: 60 * 60_000 });
    if (!rl.ok) return tooManyRequests(rl.retryAfter, "Too many attempts. Try again later.");

    const body = await req.json();
    const { name, email, password, inviteCode } = body as {
      name?: string;
      email?: string;
      password?: string;
      inviteCode?: string;
    };

    if (!name?.trim() || !email?.trim() || !password || !inviteCode?.trim()) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }
    if (!EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ error: "Please enter a valid email" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const emailLower = email.trim().toLowerCase();
    const codeUpper = inviteCode.trim().toUpperCase();

    const couples = await getCol("couples");
    const couple = await couples.findOne({
      inviteCode: { $regex: new RegExp(`^${codeUpper}$`, "i") },
    });

    if (!couple) {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
    }
    if (couple.person2Email) {
      return NextResponse.json({ error: "This invite code has already been used" }, { status: 409 });
    }

    const users = await getCol("users");
    const existingUser = await users.findOne({ email: emailLower });
    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const coupleId = couple._id.toString();

    const passwordHash = await bcrypt.hash(password, 12);
    const userResult = await users.insertOne({
      name: name.trim(),
      email: emailLower,
      passwordHash,
      coupleId,
      role: "partner" as const,
      emailVerified: false,
      createdAt: new Date().toISOString(),
    });
    const userId = userResult.insertedId.toString();

    await couples.updateOne(
      { _id: couple._id },
      { $set: { person2Name: name.trim(), person2Email: emailLower } }
    );

    // Issue + email verification code
    const code = generateOtp();
    await storeOtp(emailLower, "verify-email", code, 15);
    sendMail(emailLower, "Your verification code", verifyEmailTemplate(code)).catch(console.error);

    const token = await signSession({ userId, coupleId, name: name.trim(), role: "partner" });
    const res = NextResponse.json({ ok: true, requiresVerification: true });
    setSessionCookie(res, token);
    return res;
  } catch (e) {
    console.error("Join error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
