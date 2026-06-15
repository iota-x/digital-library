import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCol } from "@/lib/mongo";
import { signSession, setSessionCookie } from "@/lib/auth";

function generateInviteCode(): string {
  // Uppercase alphanumeric, avoiding O/0/I/1 confusion
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

export async function POST(req: NextRequest) {
  try {
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

    const emailLower = email.trim().toLowerCase();
    const users = await getCol("users");

    // Check email uniqueness
    const existingUser = await users.findOne({ email: emailLower });
    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    // Generate unique invite code
    const inviteCode = await getUniqueInviteCode();

    // Insert couple
    const couples = await getCol("couples");
    const coupleResult = await couples.insertOne({
      inviteCode,
      person1Name: name.trim(),
      person1Email: emailLower,
      startDate,
      createdAt: new Date().toISOString(),
    });
    const coupleId = coupleResult.insertedId.toString();

    // Hash password and insert user
    const passwordHash = await bcrypt.hash(password, 12);
    const userResult = await users.insertOne({
      name: name.trim(),
      email: emailLower,
      passwordHash,
      coupleId,
      role: "creator" as const,
      createdAt: new Date().toISOString(),
    });
    const userId = userResult.insertedId.toString();

    // Migration: if this is the FIRST couple, migrate existing data
    const coupleCount = await couples.countDocuments();
    if (coupleCount === 1) {
      for (const collName of DATA_COLLECTIONS) {
        try {
          const col = await getCol(collName);
          await col.updateMany(
            { coupleId: { $exists: false } },
            { $set: { coupleId } }
          );
        } catch {
          // non-fatal: collection might not exist yet
        }
      }
    }

    // Sign JWT and set cookie
    const token = await signSession({ userId, coupleId, name: name.trim(), role: "creator" });
    const res = NextResponse.json({ ok: true, inviteCode });
    setSessionCookie(res, token);
    return res;
  } catch (e) {
    console.error("Register error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
