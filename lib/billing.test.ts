/**
 * lib/billing entitlement + signature tests.
 *
 * The premium gate must FAIL OPEN (never lock a real user out of their own
 * space) yet correctly gate couples created after the launch cutoff, and the
 * payment-signature check must match Razorpay's HMAC scheme exactly.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import crypto from "node:crypto";

async function load() {
  vi.resetModules();
  return import("./billing");
}

describe("isPremiumCouple", () => {
  beforeEach(() => {
    delete process.env.PREMIUM_LAUNCH_AT;
  });

  it("is true for everyone when the paywall is off (no PREMIUM_LAUNCH_AT)", async () => {
    const { isPremiumCouple } = await load();
    expect(isPremiumCouple({ createdAt: "2099-01-01T00:00:00.000Z" })).toBe(true);
    expect(isPremiumCouple(null)).toBe(true);
  });

  it("honours an explicit premium flag regardless of dates", async () => {
    process.env.PREMIUM_LAUNCH_AT = "2026-06-01T00:00:00.000Z";
    const { isPremiumCouple } = await load();
    expect(isPremiumCouple({ premium: true, createdAt: "2030-01-01T00:00:00.000Z" })).toBe(true);
  });

  it("grandfathers couples created before the launch cutoff, gates those after", async () => {
    process.env.PREMIUM_LAUNCH_AT = "2026-06-01T00:00:00.000Z";
    const { isPremiumCouple } = await load();
    expect(isPremiumCouple({ createdAt: "2026-01-01T00:00:00.000Z" })).toBe(true);  // before → free
    expect(isPremiumCouple({ createdAt: "2026-12-01T00:00:00.000Z" })).toBe(false); // after → gated
  });

  it("fails open on a misconfigured cutoff or unknown couple age", async () => {
    process.env.PREMIUM_LAUNCH_AT = "not-a-date";
    let m = await load();
    expect(m.isPremiumCouple({ createdAt: "2026-12-01T00:00:00.000Z" })).toBe(true);

    process.env.PREMIUM_LAUNCH_AT = "2026-06-01T00:00:00.000Z";
    m = await load();
    expect(m.isPremiumCouple({})).toBe(true); // no createdAt → don't lock out
  });
});

describe("verifyPaymentSignature", () => {
  beforeEach(() => {
    delete process.env.RAZORPAY_KEY_SECRET;
  });

  it("accepts a correct HMAC and rejects a tampered one", async () => {
    process.env.RAZORPAY_KEY_SECRET = "test_secret";
    const { verifyPaymentSignature } = await load();
    const orderId = "order_123";
    const paymentId = "pay_456";
    const good = crypto.createHmac("sha256", "test_secret").update(`${orderId}|${paymentId}`).digest("hex");
    expect(verifyPaymentSignature(orderId, paymentId, good)).toBe(true);
    expect(verifyPaymentSignature(orderId, paymentId, good.replace(/.$/, "0"))).toBe(false);
    expect(verifyPaymentSignature(orderId, "pay_OTHER", good)).toBe(false);
  });

  it("rejects everything when no secret is configured", async () => {
    const { verifyPaymentSignature } = await load();
    expect(verifyPaymentSignature("o", "p", "whatever")).toBe(false);
  });
});

describe("sanitizePremiumSettings", () => {
  const base = { theme: "pink", coupleName: "Us", spotifyPlaylistId: "", loveNotes: [], memoryCards: [],
    sections: { home: {}, journal: {}, shared: {} } } as never;

  beforeEach(() => {
    process.env.PREMIUM_LAUNCH_AT = "2026-06-01T00:00:00.000Z";
  });

  it("leaves a premium couple's settings untouched", async () => {
    const { sanitizePremiumSettings } = await load();
    const settings = { ...(base as object), customAccent: "#123456", fontPairing: "modern" } as never;
    const out = sanitizePremiumSettings(settings, { premium: true, createdAt: "2030-01-01T00:00:00.000Z" });
    expect((out as { customAccent?: string }).customAccent).toBe("#123456");
    expect((out as { fontPairing?: string }).fontPairing).toBe("modern");
  });

  it("strips custom colours, fonts, saved themes & backgrounds for a non-premium couple", async () => {
    const { sanitizePremiumSettings } = await load();
    const settings = { ...(base as object), customAccent: "#123456", customAccent2: "#abcdef",
      savedThemes: [{ id: "x", name: "n", accent: "#111111" }], fontPairing: "modern",
      pageBackground: { type: "gradient", value: "g" }, pageAccents: { home: "#222222" } } as never;
    const out = sanitizePremiumSettings(settings, { createdAt: "2026-12-01T00:00:00.000Z", referralCount: 0 }) as unknown as Record<string, unknown>;
    expect(out.customAccent).toBeUndefined();
    expect(out.customAccent2).toBeUndefined();
    expect(out.savedThemes).toBeUndefined();
    expect(out.fontPairing).toBeUndefined();
    expect(out.pageBackground).toBeUndefined();
    expect(out.pageAccents).toBeUndefined();
    expect(out.theme).toBe("pink"); // built-in solid theme stays
  });

  it("keeps an earned referral reward theme for a non-premium couple", async () => {
    const { sanitizePremiumSettings } = await load();
    const { REWARD_THEMES } = await import("./themes");
    const reward = REWARD_THEMES[0]; // unlockAt: 1
    const settings = { ...(base as object), customAccent: reward.from, customAccent2: reward.to } as never;
    const out = sanitizePremiumSettings(settings, { createdAt: "2026-12-01T00:00:00.000Z", referralCount: reward.unlockAt }) as unknown as Record<string, unknown>;
    expect(out.customAccent).toBe(reward.from);
    expect(out.customAccent2).toBe(reward.to);
  });

  it("strips an unearned reward theme's colours for a non-premium couple", async () => {
    const { sanitizePremiumSettings } = await load();
    const { REWARD_THEMES } = await import("./themes");
    const reward = REWARD_THEMES[REWARD_THEMES.length - 1]; // highest unlockAt
    const settings = { ...(base as object), customAccent: reward.from, customAccent2: reward.to } as never;
    const out = sanitizePremiumSettings(settings, { createdAt: "2026-12-01T00:00:00.000Z", referralCount: 0 }) as unknown as Record<string, unknown>;
    expect(out.customAccent).toBeUndefined();
  });
});
