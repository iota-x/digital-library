import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCol } from "@/lib/mongo";
import { getSession } from "@/lib/auth";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { verifyOtp, generateOtp, storeOtp, sendMail, verifyEmailTemplate } from "@/lib/email";
import { logEvent, reqMeta } from "@/lib/events";

// POST { code } — verify the OTP for the currently signed-in user
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const rl = await rateLimit(req, { scope: "auth:verify", max: 10, windowMs: 15 * 60_000, identifier: session.userId });
    if (!rl.ok) return tooManyRequests(rl.retryAfter, "Too many verification attempts.");

    const { code } = await req.json() as { code?: string };
    if (!code?.trim()) return NextResponse.json({ error: "Code required" }, { status: 400 });

    const users = await getCol("users");
    const user = await users.findOne({ _id: new ObjectId(session.userId) });
    if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    const result = await verifyOtp(user.email, "verify-email", code.trim());
    if (!result.ok) return NextResponse.json({ error: result.reason ?? "Invalid code" }, { status: 400 });

    await users.updateOne({ _id: user._id }, { $set: { emailVerified: true, emailVerifiedAt: new Date() } });
    void logEvent("verify_email", { userId: session.userId, coupleId: session.coupleId, email: user.email, ...reqMeta(req) });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Verify error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PUT — resend the verification code to the signed-in user
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const rl = await rateLimit(req, { scope: "auth:verify:resend", max: 3, windowMs: 60 * 60_000, identifier: session.userId });
    if (!rl.ok) return tooManyRequests(rl.retryAfter, "Please wait before requesting another code.");

    const users = await getCol("users");
    const user = await users.findOne({ _id: new ObjectId(session.userId) });
    if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    if (user.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true });

    const code = generateOtp();
    await storeOtp(user.email, "verify-email", code, 15);
    sendMail(user.email, "Your verification code", verifyEmailTemplate(code)).catch(console.error);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Verify resend error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
