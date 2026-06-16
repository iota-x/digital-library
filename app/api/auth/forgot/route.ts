import { NextRequest, NextResponse } from "next/server";
import { getCol } from "@/lib/mongo";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { generateOtp, storeOtp, sendMail, resetPasswordTemplate } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST { email } — always returns ok to avoid leaking which emails are registered.
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json() as { email?: string };
    if (!email?.trim() || !EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ error: "Please enter a valid email" }, { status: 400 });
    }
    const emailLower = email.trim().toLowerCase();

    const rl = rateLimit(req, { scope: "auth:forgot", max: 3, windowMs: 60 * 60_000, identifier: emailLower });
    if (!rl.ok) return tooManyRequests(rl.retryAfter, "Please wait before requesting another code.");

    const users = await getCol("users");
    const user = await users.findOne({ email: emailLower });

    // Always send the same response — even if the email doesn't exist —
    // so an attacker can't enumerate valid accounts.
    if (user) {
      const code = generateOtp();
      await storeOtp(emailLower, "reset-password", code, 15);
      sendMail(emailLower, "Reset your password", resetPasswordTemplate(code)).catch(console.error);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Forgot error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
