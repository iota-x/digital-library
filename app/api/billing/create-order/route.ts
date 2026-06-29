import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHandler";
import { serverEnv } from "@/lib/env";
import {
  billingConfigured,
  createRazorpayOrder,
  isPremiumCouple,
  loadCouple,
  PREMIUM_PRICE_AMOUNT,
  PREMIUM_CURRENCY,
} from "@/lib/billing";

/**
 * Start a one-time premium purchase: create a Razorpay order for the signed-in
 * couple and hand the client what Checkout needs (order id, amount, public key
 * id). The coupleId is stamped into the order `notes` so the webhook can
 * attribute the payment even if the browser never calls /verify.
 */
export const POST = withAuth(
  async (_req, session) => {
    if (!billingConfigured()) {
      return NextResponse.json({ error: "Payments aren't available right now." }, { status: 503 });
    }
    const couple = await loadCouple(session.coupleId);
    if (isPremiumCouple(couple)) {
      return NextResponse.json({ ok: true, alreadyPremium: true });
    }

    const order = await createRazorpayOrder({ coupleId: session.coupleId });
    if (!order) {
      return NextResponse.json({ error: "Couldn't start checkout. Please try again." }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      amount: order.amount ?? PREMIUM_PRICE_AMOUNT,
      currency: order.currency ?? PREMIUM_CURRENCY,
      keyId: serverEnv.RAZORPAY_KEY_ID,
    });
  },
  { rateLimit: { scope: "billing:create-order", max: 10, windowMs: 60_000 } },
);
