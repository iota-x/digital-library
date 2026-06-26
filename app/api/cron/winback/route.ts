import { NextRequest, NextResponse } from "next/server";
import { getCol } from "@/lib/mongo";
import { sendPushToCouple } from "@/lib/pushNotify";
import { log } from "@/lib/log";

/**
 * Gentle re-engagement sweep — sends ONE soft nudge to paired couples who've
 * gone quiet, so an invested couple doesn't drift away silently. Same contract
 * as /api/cron/reminders:
 *
 *   GET /api/cron/winback?secret=$CRON_SECRET   (or x-cron-secret header)
 *
 * Guard rails so it never feels spammy:
 *   - only PAIRED couples (both partners joined)
 *   - only a "gone quiet but not dead" window (5–21 days since last seen)
 *   - de-duped per (couple, ISO-week) so a couple gets at most ~one per week
 *   - skipped entirely if CRON_SECRET isn't set.
 */

const DAY_MS = 86_400_000;
const QUIET_MIN_DAYS = 5;   // give them space before nudging
const QUIET_MAX_DAYS = 21;  // past this we stop — no nagging the long-gone

function isoWeekKey(d: Date): string {
  // Year + ISO week number — the dedup bucket.
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((t.getTime() - firstThu.getTime()) / DAY_MS - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
  return `${t.getUTCFullYear()}-W${week}`;
}

function daysTogether(startDate: unknown): number | null {
  if (typeof startDate !== "string" || startDate.length < 10) return null;
  const start = Date.parse(`${startDate.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(start)) return null;
  return Math.max(0, Math.floor((Date.now() - start) / DAY_MS));
}

async function handle(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  const provided = req.nextUrl.searchParams.get("secret") || req.headers.get("x-cron-secret");
  if (provided !== secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const now = new Date();
  const couples = await getCol("couples");
  const users = await getCol("users");
  const sentLog = await getCol("winbackSent");

  // Paired couples only.
  const paired = await couples
    .find({ person2Email: { $exists: true, $ne: null } },
          { projection: { startDate: 1, person1Name: 1, person2Name: 1 } })
    .toArray();

  const week = isoWeekKey(now);
  let sent = 0;

  for (const couple of paired) {
    const coupleId = couple._id.toString();

    // Most recent activity across both partners.
    const members = await users
      .find({ coupleId }, { projection: { lastSeenAt: 1 } })
      .toArray();
    const lastSeen = members
      .map((m) => (typeof m.lastSeenAt === "string" ? Date.parse(m.lastSeenAt) : 0))
      .reduce((a, b) => Math.max(a, b), 0);
    if (!lastSeen) continue;

    const quietDays = Math.floor((now.getTime() - lastSeen) / DAY_MS);
    if (quietDays < QUIET_MIN_DAYS || quietDays > QUIET_MAX_DAYS) continue;

    // One per couple per ISO week.
    const key = `${coupleId}:${week}`;
    const res = await sentLog.updateOne(
      { key }, { $setOnInsert: { key, sentAt: new Date().toISOString(), sentAtDate: new Date() } }, { upsert: true },
    );
    if (!res.upsertedId) continue;

    const days = daysTogether(couple.startDate);
    const body = days != null
      ? `${days} days together 🌷 your little world is right where you left it`
      : `your little world is right where you left it 🌷`;
    await sendPushToCouple(coupleId, { title: "it misses you both 💗", body });
    sent++;
  }

  log.info({ msg: "winback sweep done", couples: paired.length, sent });
  return NextResponse.json({ ok: true, couples: paired.length, sent });
}

export async function GET(req: NextRequest) {
  try { return await handle(req); }
  catch (err) { log.error({ msg: "winback sweep failed", err }); return NextResponse.json({ error: "internal error" }, { status: 500 }); }
}
export const POST = GET;
