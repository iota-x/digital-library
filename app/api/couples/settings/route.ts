import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCol } from "@/lib/mongo";
import { withAuth } from "@/lib/apiHandler";
import { DEFAULT_SETTINGS, type CoupleSettings } from "@/lib/themes";
import { badRequest } from "@/lib/validate";
import { loadCouple, sanitizePremiumSettings } from "@/lib/billing";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const GET = withAuth(async (_req, session) => {
  const col    = await getCol("couples");
  const couple = await col.findOne({ _id: new ObjectId(session.coupleId) });
  return NextResponse.json({ ok: true, settings: couple?.settings ?? DEFAULT_SETTINGS });
});

export const PUT = withAuth(async (req, session) => {
  const body = await req.json().catch(() => null) as { settings?: CoupleSettings; startDate?: string } | null;
  const settings = body?.settings;
  const startDate = body?.startDate;
  // Boundary check: settings is the couple's own evolving blob, so we require a
  // well-formed object with a string theme rather than exhaustively typing
  // every nested toggle (which would also risk stripping new fields). The full
  // object is persisted as-is once it passes this gate.
  if (!settings || typeof settings !== "object" || typeof settings.theme !== "string") {
    return badRequest("settings: must be an object with a string `theme`");
  }
  if (startDate !== undefined && !ISO_DATE.test(startDate)) {
    return badRequest("startDate: must be YYYY-MM-DD");
  }
  // Premium gate: strip paid-only personalization (custom colours, saved themes,
  // page accents/backgrounds, fonts) for non-premium couples, so the paywall
  // holds even against a direct POST. Earned referral reward themes still pass.
  const couple = await loadCouple(session.coupleId);
  const patch: Record<string, unknown> = { settings: sanitizePremiumSettings(settings, couple) };
  if (startDate) patch.startDate = startDate;
  const col = await getCol("couples");
  await col.updateOne({ _id: new ObjectId(session.coupleId) }, { $set: patch });
  return NextResponse.json({ ok: true });
}, { rateLimit: { scope: "couples:settings", max: 40, windowMs: 60_000 } });
