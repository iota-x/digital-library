import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCol } from "@/lib/mongo";
import { signSession, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
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

    const emailLower = email.trim().toLowerCase();
    const codeUpper = inviteCode.trim().toUpperCase();

    // Find couple by invite code (case-insensitive)
    const couples = await getCol("couples");
    const couple = await couples.findOne({
      inviteCode: { $regex: new RegExp(`^${codeUpper}$`, "i") },
    });

    if (!couple) {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
    }

    // Check if couple already has person2
    if (couple.person2Email) {
      return NextResponse.json({ error: "This invite code has already been used" }, { status: 409 });
    }

    // Check email uniqueness
    const users = await getCol("users");
    const existingUser = await users.findOne({ email: emailLower });
    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const coupleId = couple._id.toString();

    // Hash password and insert user with partner role
    const passwordHash = await bcrypt.hash(password, 12);
    const userResult = await users.insertOne({
      name: name.trim(),
      email: emailLower,
      passwordHash,
      coupleId,
      role: "partner" as const,
      createdAt: new Date().toISOString(),
    });
    const userId = userResult.insertedId.toString();

    // Update couple with person2 info
    await couples.updateOne(
      { _id: couple._id },
      { $set: { person2Name: name.trim(), person2Email: emailLower } }
    );

    // Sign JWT and set cookie
    const token = await signSession({ userId, coupleId, name: name.trim(), role: "partner" });
    const res = NextResponse.json({ ok: true });
    setSessionCookie(res, token);
    return res;
  } catch (e) {
    console.error("Join error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
