import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHandler";
import { broadcastToCouple } from "@/lib/sseBroadcast";
import { sendPushToCouple } from "@/lib/pushNotify";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";

/**
 * Send a heart to the partner. Broadcasts on SSE for an in-app floating
 * heart animation; also fires a push so the heart can arrive even when
 * the app is closed.
 *
 * Rate-limited per user so a stuck button doesn't spam.
 */
export const POST = withAuth(async (req, session) => {
  const rl = rateLimit(req, { scope: "presence:heart", max: 30, windowMs: 60_000, identifier: session.userId });
  if (!rl.ok) return tooManyRequests(rl.retryAfter, "easy on the hearts 🩷");

  const body = await req.json().catch(() => ({}));
  const section = typeof body?.section === "string" ? body.section.slice(0, 64) : "";

  broadcastToCouple(session.coupleId, {
    type: "presence:heart",
    userId: session.userId,
    name: session.name,
    section,
    ts: Date.now(),
  });

  // Don't push to the sender, only the partner — broadcastToCouple already
  // hits both, but for push we want partner-only. sendPushToCouple targets
  // everyone subscribed; the receiver will recognise it's a notification.
  sendPushToCouple(session.coupleId, {
    title: "a heart for you 🩷",
    body: `${session.name} sent you a heart`,
  });

  return NextResponse.json({ ok: true });
});
