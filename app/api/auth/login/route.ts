import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCol } from "@/lib/mongo";
import { signSession, setSessionCookie } from "@/lib/auth";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json() as { email?: string; password?: string };

    if (!email?.trim() || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const emailLower = email.trim().toLowerCase();

    // Rate limit by IP+email — 5 attempts per 15 minutes
    const rl = await rateLimit(req, { scope: "auth:login", max: 5, windowMs: 15 * 60_000, identifier: emailLower });
    if (!rl.ok) return tooManyRequests(rl.retryAfter, "Too many login attempts. Try again later.");

    const users = await getCol("users");
    const user = await users.findOne({ email: emailLower });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (user.emailVerified === false) {
      return NextResponse.json({ error: "Please verify your email first. Check your inbox." }, { status: 403 });
    }

    const userId = user._id.toString();
    const token = await signSession({
      userId,
      coupleId: user.coupleId,
      name: user.name,
      role: user.role,
    });

    const res = NextResponse.json({ ok: true });
    setSessionCookie(res, token);
    return res;
  } catch (e) {
    console.error("Login error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
