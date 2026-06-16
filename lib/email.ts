/**
 * Centralized transactional email + OTP helpers.
 *
 * - Uses Resend if RESEND_API_KEY is set
 * - In dev (or when key missing) logs the message instead so flows work offline
 */
import crypto from "crypto";
import { getCol } from "@/lib/mongo";
import { serverEnv, publicEnv } from "@/lib/env";
import { log } from "@/lib/log";

const FROM = serverEnv.EMAIL_FROM;
const APP_NAME = publicEnv.APP_NAME;

export async function sendMail(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  const apiKey = serverEnv.RESEND_API_KEY;
  if (!apiKey || apiKey.startsWith("re_placeholder")) {
    log.info({ msg: "email:dev — skipped send", to, subject });
    return { ok: true };
  }
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    await resend.emails.send({ from: FROM, to, subject, html });
    return { ok: true };
  } catch (err) {
    log.error({ msg: "mail send failed", err, to, subject });
    return { ok: false, error: String(err) };
  }
}

/* ── OTP storage (Mongo) ────────────────────────────────────────────────
   One pending code per email per purpose. Keeps last issue + expiry +
   bcrypt-style hash so the raw code isn't stored. */

function hashCode(code: string, email: string): string {
  return crypto.createHmac("sha256", serverEnv.JWT_SECRET).update(`${email}:${code}`).digest("hex");
}

export function generateOtp(): string {
  // 6-digit numeric — secure RNG, zero-padded
  const n = crypto.randomInt(0, 1_000_000);
  return n.toString().padStart(6, "0");
}

export type OtpPurpose = "verify-email" | "reset-password";

export async function storeOtp(email: string, purpose: OtpPurpose, code: string, ttlMinutes = 15): Promise<void> {
  const col = await getCol("otps");
  await col.updateOne(
    { email, purpose },
    {
      $set: {
        email,
        purpose,
        codeHash: hashCode(code, email),
        expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
        attempts: 0,
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );
}

export async function verifyOtp(email: string, purpose: OtpPurpose, code: string): Promise<{ ok: boolean; reason?: string }> {
  const col = await getCol("otps");
  const doc = await col.findOne({ email, purpose });
  if (!doc) return { ok: false, reason: "No code requested for this email." };
  if (doc.expiresAt < new Date()) {
    await col.deleteOne({ _id: doc._id });
    return { ok: false, reason: "Code expired. Request a new one." };
  }
  if (doc.attempts >= 5) {
    await col.deleteOne({ _id: doc._id });
    return { ok: false, reason: "Too many wrong attempts. Request a new code." };
  }
  if (doc.codeHash !== hashCode(code, email)) {
    await col.updateOne({ _id: doc._id }, { $inc: { attempts: 1 } });
    return { ok: false, reason: "Incorrect code." };
  }
  // Single-use: consume on success
  await col.deleteOne({ _id: doc._id });
  return { ok: true };
}

/* ── Templates ──────────────────────────────────────────────────────── */

export function verifyEmailTemplate(code: string): string {
  return `
    <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;background:#fff5f9;padding:40px 32px;border-radius:20px">
      <div style="text-align:center;font-size:2.5rem;margin-bottom:8px">💗</div>
      <h2 style="font-family:Georgia,serif;color:#be185d;text-align:center;font-weight:400;margin:0 0 4px">verify your email</h2>
      <p style="text-align:center;color:#9d174d;font-size:0.9rem;margin:0 0 32px">
        Welcome to ${APP_NAME}! Use the code below to verify.
      </p>
      <div style="background:#fff;border:1px solid #f9a8d4;border-radius:16px;padding:28px 24px;text-align:center">
        <p style="font-family:'Courier New',monospace;font-size:2.5rem;letter-spacing:0.4em;color:#be185d;margin:0;font-weight:700">${code}</p>
        <p style="color:#9d174d;font-size:0.78rem;margin:12px 0 0">This code expires in 15 minutes.</p>
      </div>
      <p style="text-align:center;color:#be185d;font-size:0.78rem;margin-top:24px">
        If you didn't ask for this, just ignore the email.
      </p>
    </div>`;
}

export function resetPasswordTemplate(code: string): string {
  return `
    <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;background:#fff5f9;padding:40px 32px;border-radius:20px">
      <div style="text-align:center;font-size:2.5rem;margin-bottom:8px">🔑</div>
      <h2 style="font-family:Georgia,serif;color:#be185d;text-align:center;font-weight:400;margin:0 0 4px">reset your password</h2>
      <p style="text-align:center;color:#9d174d;font-size:0.9rem;margin:0 0 32px">
        Someone (hopefully you) asked to reset your password.
      </p>
      <div style="background:#fff;border:1px solid #f9a8d4;border-radius:16px;padding:28px 24px;text-align:center">
        <p style="font-family:'Courier New',monospace;font-size:2.5rem;letter-spacing:0.4em;color:#be185d;margin:0;font-weight:700">${code}</p>
        <p style="color:#9d174d;font-size:0.78rem;margin:12px 0 0">This code expires in 15 minutes.</p>
      </div>
      <p style="text-align:center;color:#be185d;font-size:0.78rem;margin-top:24px">
        If you didn't ask for this, your account is still safe — just ignore this email.
      </p>
    </div>`;
}
