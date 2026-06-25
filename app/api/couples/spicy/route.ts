import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCol } from "@/lib/mongo";
import { withAuth } from "@/lib/apiHandler";
import { broadcastToCouple } from "@/lib/sseBroadcast";
import { DEFAULT_SETTINGS } from "@/lib/themes";

/**
 * Couple-level "spicy mode" toggle for the /play truth-or-dare game. Lives on
 * the shared couple `settings` so BOTH partners get the same state, and
 * broadcasts a `settings:spicy` event so the other person's UI flips live.
 *
 * We read-merge-write the full settings object (rather than `$set`-ing the
 * nested path) so couples whose `settings` field is missing/partial don't lose
 * their theme and other fields.
 */
export const PUT = withAuth(async (req, session) => {
  const body = await req.json().catch(() => null) as { on?: boolean } | null;
  const on = body?.on === true;

  const col = await getCol("couples");
  const couple = await col.findOne({ _id: new ObjectId(session.coupleId) });
  const settings = { ...(couple?.settings ?? DEFAULT_SETTINGS), spicyMode: on };
  await col.updateOne({ _id: new ObjectId(session.coupleId) }, { $set: { settings } });

  broadcastToCouple(session.coupleId, { type: "settings:spicy", on });
  return NextResponse.json({ ok: true, on });
}, { rateLimit: { scope: "couples:spicy", max: 30, windowMs: 60_000 } });
