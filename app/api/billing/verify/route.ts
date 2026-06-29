import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHandler";
import { markCouplePremium, verifyPaymentSignature } from "@/lib/billing";

/**
 * Confirm a Razorpay Checkout success. The client posts the order/payment ids +
 * signature; we verify the HMAC (proving the payment is genuine) and then mark
 * the *signed-in* couple premium. Session-bound, so a caller can only upgrade
 * their own space. The webhook is the backstop if this call never happens.
 */
export const POST = withAuth(
  async (req, session) => {
    const body = (await req.json().catch(() => null)) as
      | { orderId?: string; paymentId?: string; signature?: string }
      | null;
    const orderId = body?.orderId ?? "";
    const paymentId = body?.paymentId ?? "";
    const signature = body?.signature ?? "";

    if (!verifyPaymentSignature(orderId, paymentId, signature)) {
      return NextResponse.json({ error: "Payment could not be verified." }, { status: 400 });
    }

    await markCouplePremium(session.coupleId, { orderId, paymentId });
    return NextResponse.json({ ok: true });
  },
  { rateLimit: { scope: "billing:verify", max: 20, windowMs: 60_000 } },
);
