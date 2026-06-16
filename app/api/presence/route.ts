import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiHandler";
import { broadcastToCouple } from "@/lib/sseBroadcast";

/**
 * Presence tick — the client POSTs every few seconds while the user is
 * actively viewing the app. The body says which section they're looking at;
 * we broadcast that to the partner so the partner's UI can show a soft dot
 * near the matching section.
 *
 * No persistence: presence is ephemeral. If both partners reload, both
 * presence states reset.
 */
export const POST = withAuth(async (req, session) => {
  const body = await req.json().catch(() => ({}));
  const section = typeof body?.section === "string" ? body.section.slice(0, 64) : "";
  broadcastToCouple(session.coupleId, {
    type: "presence:tick",
    userId: session.userId,
    name: session.name,
    section,
    ts: Date.now(),
  });
  return NextResponse.json({ ok: true });
});
