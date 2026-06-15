import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCol } from "@/lib/mongo";
import { signSession, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json() as { email?: string; password?: string };

    if (!email?.trim() || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const emailLower = email.trim().toLowerCase();
    const users = await getCol("users");
    const user = await users.findOne({ email: emailLower });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
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
