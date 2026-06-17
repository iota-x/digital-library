import { NextRequest, NextResponse } from "next/server";
import { getCol } from "@/lib/mongo";
import { sendPushToCouple } from "@/lib/pushNotify";
import { log } from "@/lib/log";

/**
 * Scheduled reminder sweep — fires push notifications for upcoming anniversaries
 * and birthdays. Designed to be hit once a day by an external scheduler
 * (Vercel Cron, GitHub Action, cron-job.org, etc.):
 *
 *   GET /api/cron/reminders?secret=$CRON_SECRET
 *   — or — header  x-cron-secret: $CRON_SECRET
 *
 * Guarded by CRON_SECRET so the endpoint can't be triggered by the public.
 * If CRON_SECRET isn't configured the route refuses to run (503). Sends are
 * de-duplicated per (couple, occasion, days-out) so running it more than once
 * a day never double-notifies.
 */

const THRESHOLDS = [7, 3, 1, 0]; // days-before to remind at
const DAY_MS = 86_400_000;

/** Days until the next occurrence of an MM-DD anniversary of a date. */
function daysUntilMMDD(mmdd: string, now: Date): number {
  const [m, d] = mmdd.split("-").map(Number);
  if (!m || !d) return -1;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  let target = Date.UTC(now.getUTCFullYear(), m - 1, d);
  if (target < today) target = Date.UTC(now.getUTCFullYear() + 1, m - 1, d);
  return Math.round((target - today) / DAY_MS);
}

function inWords(days: number, label: string, emoji: string): { title: string; body: string } {
  if (days === 0) return { title: `${emoji} today!`, body: `${label} is today` };
  if (days === 1) return { title: `${emoji} tomorrow`, body: `${label} is tomorrow` };
  return { title: `${emoji} in ${days} days`, body: `${label} is coming up` };
}

async function handle(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  const provided = req.nextUrl.searchParams.get("secret") || req.headers.get("x-cron-secret");
  if (provided !== secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const now = new Date();
  const couples = await getCol("couples");
  const sentLog = await getCol("reminderSent");
  const all = await couples.find({}, { projection: { startDate: 1, person1Name: 1, person2Name: 1, settings: 1 } }).toArray();

  let sent = 0;
  for (const couple of all) {
    const coupleId = couple._id.toString();
    const s = (couple.settings ?? {}) as Record<string, unknown>;

    const occasions: { type: string; mmdd: string; label: string; emoji: string }[] = [];

    if (typeof couple.startDate === "string" && couple.startDate.length >= 10) {
      const startYear = Number(couple.startDate.slice(0, 4));
      const years = now.getUTCFullYear() - startYear;
      occasions.push({
        type: "anniversary",
        mmdd: couple.startDate.slice(5),
        label: years > 0 ? `your ${years}-year anniversary` : "your anniversary",
        emoji: "💍",
      });
    }
    if (typeof s.userBirthday === "string") {
      occasions.push({ type: "bday-user", mmdd: s.userBirthday, label: `${couple.person1Name || "a"}'s birthday`, emoji: "🎂" });
    }
    if (typeof s.partnerBirthday === "string") {
      occasions.push({ type: "bday-partner", mmdd: s.partnerBirthday, label: `${couple.person2Name || "their"}'s birthday`, emoji: "🎂" });
    }

    for (const occ of occasions) {
      const days = daysUntilMMDD(occ.mmdd, now);
      if (!THRESHOLDS.includes(days)) continue;

      // Target year disambiguates this occurrence so next year fires again.
      const targetYear = days === 0 ? now.getUTCFullYear() : new Date(now.getTime() + days * DAY_MS).getUTCFullYear();
      const key = `${coupleId}:${occ.type}:${targetYear}:${days}`;

      // Dedup: only the run that newly inserts the key actually sends.
      const res = await sentLog.updateOne(
        { key },
        { $setOnInsert: { key, sentAt: new Date().toISOString() } },
        { upsert: true },
      );
      if (!res.upsertedId) continue;

      const { title, body } = inWords(days, occ.label, occ.emoji);
      await sendPushToCouple(coupleId, { title, body });
      sent++;
    }
  }

  log.info({ msg: "reminder sweep done", couples: all.length, sent });
  return NextResponse.json({ ok: true, couples: all.length, sent });
}

export async function GET(req: NextRequest) {
  try { return await handle(req); }
  catch (err) { log.error({ msg: "reminder sweep failed", err }); return NextResponse.json({ error: "internal error" }, { status: 500 }); }
}
export const POST = GET;
