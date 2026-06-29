import crypto from "node:crypto";
import { ObjectId } from "mongodb";
import { getCol } from "@/lib/mongo";
import { serverEnv } from "@/lib/env";
import { REWARD_THEMES, type CoupleSettings } from "@/lib/themes";

/**
 * Premium ("lifetime") entitlement + Razorpay one-time payment helpers.
 *
 * Server-only. The whole feature is fail-OPEN: when Razorpay isn't configured
 * (no keys) or `PREMIUM_LAUNCH_AT` is unset, every couple is treated as premium
 * and the billing endpoints are inert — so the app behaves exactly as it did
 * before this feature existed. The paywall activates only once the owner sets
 * `PREMIUM_LAUNCH_AT` (and configures Razorpay to actually take payment).
 */

// ─── Pricing / limits (overridable via env) ───
const num = (v: string, fallback: number) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
/** One-time price in the smallest currency unit (paise for INR). ₹499 default. */
export const PREMIUM_PRICE_AMOUNT = num(serverEnv.PREMIUM_PRICE_PAISE, 49900);
export const PREMIUM_CURRENCY = serverEnv.PREMIUM_CURRENCY || "INR";
/** Free couples may keep up to this many calendar (memory) photos total. */
export const FREE_PHOTO_CAP = num(serverEnv.FREE_PHOTO_CAP, 100);

/** Minimal shape of a `couples` document for the fields this module reads. */
export interface CoupleDoc {
  createdAt?: string;
  premium?: boolean;
  referralCount?: number;
  settings?: CoupleSettings;
  [key: string]: unknown;
}

/** True when Razorpay keys are present, i.e. payments can actually be taken. */
export function billingConfigured(): boolean {
  return serverEnv.RAZORPAY_KEY_ID.length > 0 && serverEnv.RAZORPAY_KEY_SECRET.length > 0;
}

/**
 * Is this couple entitled to premium? True when they explicitly paid, OR the
 * paywall isn't switched on (no/invalid `PREMIUM_LAUNCH_AT`), OR they were
 * created before the launch cutoff (grandfathered). Fails open everywhere so a
 * misconfiguration never locks paying-or-not users out of their own data.
 */
export function isPremiumCouple(couple: CoupleDoc | null | undefined): boolean {
  if (couple?.premium === true) return true;
  const launch = serverEnv.PREMIUM_LAUNCH_AT;
  if (!launch) return true; // paywall off
  const launchMs = Date.parse(launch);
  if (!Number.isFinite(launchMs)) return true; // misconfigured → don't gate
  const created = Date.parse(couple?.createdAt ?? "");
  if (!Number.isFinite(created)) return true; // unknown age → don't lock out
  return created < launchMs; // grandfathered if they predate launch
}

/** Load a couple document by its string id (ObjectId-guarded), or null. */
export async function loadCouple(coupleId: string): Promise<CoupleDoc | null> {
  if (!ObjectId.isValid(coupleId)) return null;
  const col = await getCol("couples");
  return (await col.findOne({ _id: new ObjectId(coupleId) })) as CoupleDoc | null;
}

/** Constant-time hex-string compare (lengths may differ). */
function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/**
 * Create a Razorpay order via the REST API (no SDK). `notes` carries our
 * coupleId so the webhook can attribute the payment. Returns the order or null
 * when billing isn't configured / the API call fails.
 */
export async function createRazorpayOrder(
  notes: Record<string, string>,
): Promise<{ id: string; amount: number; currency: string } | null> {
  if (!billingConfigured()) return null;
  const auth = Buffer.from(`${serverEnv.RAZORPAY_KEY_ID}:${serverEnv.RAZORPAY_KEY_SECRET}`).toString("base64");
  try {
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: PREMIUM_PRICE_AMOUNT,
        currency: PREMIUM_CURRENCY,
        notes,
        payment_capture: 1,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const order = (await res.json()) as { id?: string; amount?: number; currency?: string };
    if (!order.id) return null;
    return { id: order.id, amount: order.amount ?? PREMIUM_PRICE_AMOUNT, currency: order.currency ?? PREMIUM_CURRENCY };
  } catch {
    return null;
  }
}

/** Verify the Checkout success signature: HMAC_SHA256(order_id|payment_id, key_secret). */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  if (!serverEnv.RAZORPAY_KEY_SECRET || !orderId || !paymentId || !signature) return false;
  const expected = crypto
    .createHmac("sha256", serverEnv.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return safeEqualHex(expected, signature);
}

/** Verify a Razorpay webhook: HMAC_SHA256(rawBody, webhook_secret). */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = serverEnv.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Mark a couple premium after a verified payment (idempotent). */
export async function markCouplePremium(
  coupleId: string,
  ids: { orderId?: string; paymentId?: string },
): Promise<void> {
  if (!ObjectId.isValid(coupleId)) return;
  const col = await getCol("couples");
  await col.updateOne(
    { _id: new ObjectId(coupleId) },
    {
      $set: {
        premium: true,
        premiumAt: new Date().toISOString(),
        ...(ids.paymentId ? { premiumPaymentId: ids.paymentId } : {}),
        ...(ids.orderId ? { premiumOrderId: ids.orderId } : {}),
      },
    },
  );
}

// Premium-only personalization fields (kept in sync with the appearance UI).
const PREMIUM_ONLY_FIELDS = ["savedThemes", "pageAccents", "pageBackground", "fontPairing"] as const;

/**
 * Strip premium-only personalization from a settings blob for non-premium
 * couples, so the paywall holds even if a client posts gated values directly.
 *
 * Custom accent colours (`customAccent`/`customAccent2`) live in the same fields
 * that the referral REWARD themes use, so they're allowed through *only* when
 * they exactly match a reward gradient the couple has already unlocked — that
 * keeps the "reward themes stay free" promise while blocking arbitrary custom /
 * gradient-preset colours. Built-in solid `theme` palettes are always free.
 */
export function sanitizePremiumSettings(settings: CoupleSettings, couple: CoupleDoc | null): CoupleSettings {
  if (isPremiumCouple(couple)) return settings;
  const out: CoupleSettings = { ...settings };

  const referralCount = couple?.referralCount ?? 0;
  const earnedPairs = new Set(
    REWARD_THEMES.filter(t => referralCount >= t.unlockAt).map(t => `${t.from.toLowerCase()}|${t.to.toLowerCase()}`),
  );
  const pair = `${(out.customAccent ?? "").toLowerCase()}|${(out.customAccent2 ?? "").toLowerCase()}`;
  if (!(out.customAccent && earnedPairs.has(pair))) {
    delete out.customAccent;
    delete out.customAccent2;
  }
  for (const f of PREMIUM_ONLY_FIELDS) delete out[f];
  return out;
}
