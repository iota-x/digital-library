import { NextRequest, NextResponse } from "next/server";
import { markCouplePremium, verifyWebhookSignature } from "@/lib/billing";
import { log } from "@/lib/log";

/**
 * Razorpay webhook — the reliability backstop for premium upgrades. If a buyer
 * closes the tab before the client calls /verify, this still marks the couple
 * premium. Public (no session): authenticity comes from the HMAC signature over
 * the raw body. Idempotent — marking an already-premium couple is a harmless
 * re-set. Always 200s on a valid signature so Razorpay doesn't retry-storm.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    const event = JSON.parse(raw) as {
      event?: string;
      payload?: {
        payment?: { entity?: { id?: string; order_id?: string; notes?: Record<string, string> } };
        order?: { entity?: { id?: string; notes?: Record<string, string> } };
      };
    };

    if (event.event === "payment.captured" || event.event === "order.paid") {
      const payment = event.payload?.payment?.entity;
      const order = event.payload?.order?.entity;
      const coupleId = payment?.notes?.coupleId ?? order?.notes?.coupleId;
      if (coupleId) {
        await markCouplePremium(coupleId, {
          orderId: payment?.order_id ?? order?.id,
          paymentId: payment?.id,
        });
      }
    }
  } catch (e) {
    log.error({ msg: "razorpay webhook handling failed", err: e });
    // Signature was valid; swallow downstream errors so Razorpay doesn't retry.
  }

  return NextResponse.json({ ok: true });
}
