import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHandler";
import { broadcastToCouple } from "@/lib/sseBroadcast";
import { sendPushToOtherInCouple } from "@/lib/pushNotify";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";

/**
 * Send a reaction to the partner. Broadcasts on SSE for an in-app floating
 * emoji animation; also fires a push so it can arrive even when the app is
 * closed. Defaults to a heart; an optional `emoji` picks another reaction
 * from a small allow-list (so the broadcast/push can't carry arbitrary text).
 *
 * Rate-limited per user so a stuck button doesn't spam.
 */
const REACTIONS: Record<string, string> = {
  "🩷": "sent you a heart",
  "😘": "blew you a kiss",
  "🥺": "is missing you",
  "🤗": "sent you a hug",
  "🔥": "thinks you're on fire",
  "💭": "is thinking of you",
};

export const POST = withAuth(async (req, session) => {
  const rl = await rateLimit(req, { scope: "presence:heart", max: 30, windowMs: 60_000, identifier: session.userId });
  if (!rl.ok) return tooManyRequests(rl.retryAfter, "easy on the love 🩷");

  const body = await req.json().catch(() => ({}));
  const section = typeof body?.section === "string" ? body.section.slice(0, 64) : "";
  const emoji = typeof body?.emoji === "string" && REACTIONS[body.emoji] ? body.emoji : "🩷";

  broadcastToCouple(session.coupleId, {
    type: "presence:heart",
    userId: session.userId,
    name: session.name,
    emoji,
    section,
    ts: Date.now(),
  });

  // Partner-only push — don't notify the sender about their own reaction.
  sendPushToOtherInCouple(session.coupleId, session.userId, {
    title: `${emoji} for you`,
    body: `${session.name} ${REACTIONS[emoji]}`,
  });

  return NextResponse.json({ ok: true });
});
