import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCol } from "@/lib/mongo";
import { withAuth } from "@/lib/apiHandler";
import { clearSessionCookie } from "@/lib/auth";
import { log } from "@/lib/log";

/**
 * "Close our space" — a dignified, permanent offboarding. Knowing they CAN
 * leave (with their memories, via the export above) is what lets couples invest
 * deeply, so this is a trust feature, not just a destructive one.
 *
 * Purges the couple and everything keyed to it. Irreversible — the client gates
 * it behind a type-to-confirm dialog, and we require an explicit confirm token
 * so it can never fire by accident. Session is cleared on the way out.
 */

// Keep in sync with app/api/export/route.ts COUPLE_COLLECTIONS (+ ephemeral
// device/analytics collections we also clear for a clean exit).
const COUPLE_KEYED = [
  "calendar", "bucketlist", "watchlist", "voicenotes",
  "capsules", "dailyAnswers", "doodles", "watchSessions",
  "pushSubscriptions", "pageviews", "events", "reminderSent", "winbackSent",
];

export const POST = withAuth(
  async (req, session) => {
    const body = await req.json().catch(() => ({}));
    if (body?.confirm !== "DELETE") {
      return NextResponse.json({ error: "confirmation required" }, { status: 400 });
    }

    const coupleId = session.coupleId;
    let deleted = 0;
    for (const name of COUPLE_KEYED) {
      try {
        const col = await getCol(name);
        const r = await col.deleteMany({ coupleId });
        deleted += r.deletedCount ?? 0;
      } catch (err) {
        log.warn({ msg: "leave: collection purge failed (non-fatal)", err, collection: name });
      }
    }

    // Both partners' accounts, then the couple itself.
    try { await (await getCol("users")).deleteMany({ coupleId }); } catch (err) { log.warn({ msg: "leave: user purge failed", err }); }
    try { await (await getCol("couples")).deleteOne({ _id: new ObjectId(coupleId) }); } catch (err) { log.warn({ msg: "leave: couple purge failed", err }); }

    log.info({ msg: "couple closed their space", coupleId, docsDeleted: deleted });

    const res = NextResponse.json({ ok: true });
    clearSessionCookie(res);
    return res;
  },
  { rateLimit: { scope: "couple:leave", max: 3, windowMs: 60 * 60_000 } },
);
