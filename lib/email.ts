/**
 * Centralized transactional email + OTP helpers.
 *
 * Provider priority:
 *  1. Gmail SMTP — when GMAIL_USER + GMAIL_APP_PASSWORD are set. Delivers to any
 *     recipient with no domain to verify, so it's the easy path for a personal app.
 *  2. Resend — when RESEND_API_KEY is set (needs a verified domain to reach
 *     arbitrary recipients).
 *  3. Neither set → log the message instead so flows still work offline in dev.
 */
import crypto from "crypto";
import { getCol } from "@/lib/mongo";
import { serverEnv, publicEnv } from "@/lib/env";
import { log } from "@/lib/log";

const FROM = serverEnv.EMAIL_FROM;
const APP_NAME = publicEnv.APP_NAME;

export async function sendMail(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  // 1) Gmail SMTP (preferred when configured) — no domain needed.
  const gmailUser = serverEnv.GMAIL_USER;
  const gmailPass = serverEnv.GMAIL_APP_PASSWORD;
  if (gmailUser && gmailPass) {
    try {
      const nodemailer = (await import("nodemailer")).default;
      const transport = nodemailer.createTransport({
        service: "gmail",
        auth: { user: gmailUser, pass: gmailPass },
      });
      // Gmail authenticates as gmailUser, so the From address must be that
      // account; keep the friendly display name from EMAIL_FROM (or APP_NAME).
      const displayName = FROM.split("<")[0].trim() || APP_NAME;
      await transport.sendMail({ from: `${displayName} <${gmailUser}>`, to, subject, html });
      return { ok: true };
    } catch (err) {
      log.error({ msg: "gmail send failed", err, to, subject });
      return { ok: false, error: String(err) };
    }
  }

  // 2) Resend (needs a verified domain to reach non-account recipients).
  const apiKey = serverEnv.RESEND_API_KEY;
  if (!apiKey || apiKey.startsWith("re_placeholder")) {
    log.info({ msg: "email:dev — skipped send", to, subject });
    return { ok: true };
  }
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    // Resend reports recipient/domain problems in the response body without
    // throwing — e.g. the onboarding@resend.dev sandbox sender only delivers to
    // your own account email until a domain is verified. Surface that instead of
    // pretending the send succeeded.
    if (error) {
      log.error({ msg: "mail send rejected", error, to, subject, from: FROM });
      return { ok: false, error: String((error as { message?: string }).message ?? error) };
    }
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
