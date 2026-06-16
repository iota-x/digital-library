import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCol } from "@/lib/mongo";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { verifyOtp } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST { email, code, password } — verify reset code and replace password
export async function POST(req: NextRequest) {
  try {
    const { email, code, password } = await req.json() as { email?: string; code?: string; password?: string };
    if (!email?.trim() || !code?.trim() || !password) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }
    if (!EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const emailLower = email.trim().toLowerCase();

    const rl = rateLimit(req, { scope: "auth:reset", max: 5, windowMs: 15 * 60_000, identifier: emailLower });
    if (!rl.ok) return tooManyRequests(rl.retryAfter, "Too many attempts.");

    const result = await verifyOtp(emailLower, "reset-password", code.trim());
    if (!result.ok) return NextResponse.json({ error: result.reason ?? "Invalid code" }, { status: 400 });

    const users = await getCol("users");
    const passwordHash = await bcrypt.hash(password, 12);
    const update = await users.updateOne({ email: emailLower }, { $set: { passwordHash, passwordChangedAt: new Date() } });
    if (update.matchedCount === 0) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Reset error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
