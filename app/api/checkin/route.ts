import { NextResponse } from "next/server";
import { getCol } from "@/lib/mongo";
import { withAuth } from "@/lib/apiHandler";
import { broadcastToCouple } from "@/lib/sseBroadcast";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { senderDisplayName } from "@/lib/displayName";

/**
 * Weekly relationship check-in — each partner taps a 1–5 "how are we?" once a
 * week. Private to the couple. The current week reveals the partner's number
 * only once you've both checked in (like the daily question); past weeks show
 * a gentle average trend.
 */

interface CheckinDoc {
  coupleId: string;
  week: string;
  ratings: Record<string, { name: string; value: number; at: string }>;
}

/** Monday (UTC) of the week containing `d`, as YYYY-MM-DD. */
function weekStart(d = new Date()): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = (date.getUTCDay() + 6) % 7; // 0 = Monday
  date.setUTCDate(date.getUTCDate() - dow);
  return date.toISOString().slice(0, 10);
}
function addWeeks(weekKey: string, n: number): string {
  const d = new Date(`${weekKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n * 7);
  return d.toISOString().slice(0, 10);
}

function viewFor(doc: CheckinDoc | null, userId: string, week: string, history: { week: string; avg: number; count: number }[]) {
  const ratings = doc?.ratings ?? {};
  const mineEntry = ratings[userId] ?? null;
  const partnerEntry = Object.entries(ratings).find(([uid]) => uid !== userId) ?? null;
  const both = !!mineEntry && !!partnerEntry;
  return {
    week,
    mine: mineEntry?.value ?? null,
    partnerSubmitted: !!partnerEntry,
    both,
    partner: both && partnerEntry ? { name: partnerEntry[1].name, value: partnerEntry[1].value } : null,
    history,
  };
}

async function buildHistory(coupleId: string, week: string) {
  const col = await getCol("checkins");
  const lower = addWeeks(week, -7);
  const docs = (await col.find({ coupleId, week: { $gte: lower, $lte: week } }).toArray()) as unknown as CheckinDoc[];
  const byWeek = new Map(docs.map((d) => [d.week, d]));
  const out: { week: string; avg: number; count: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const w = addWeeks(week, -i);
    const vals = Object.values(byWeek.get(w)?.ratings ?? {}).map((r) => r.value);
    out.push({ week: w, avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0, count: vals.length });
  }
  return out;
}

export const GET = withAuth(async (_req, session) => {
  const week = weekStart();
  const col = await getCol("checkins");
  const doc = (await col.findOne({ coupleId: session.coupleId, week })) as CheckinDoc | null;
  const history = await buildHistory(session.coupleId, week);
  return NextResponse.json(viewFor(doc, session.userId, week, history));
});

export const POST = withAuth(async (req, session) => {
  const rl = await rateLimit(req, { scope: "checkin", max: 20, windowMs: 60_000, identifier: session.userId });
  if (!rl.ok) return tooManyRequests(rl.retryAfter);

  const { value } = (await req.json().catch(() => ({}))) as { value?: number };
  const v = Math.round(Number(value));
  if (!Number.isFinite(v) || v < 1 || v > 5) {
    return NextResponse.json({ error: "value must be 1–5" }, { status: 400 });
  }

  const week = weekStart();
  const col = await getCol("checkins");
  const before = (await col.findOne({ coupleId: session.coupleId, week })) as CheckinDoc | null;
  const hadMine = !!before?.ratings?.[session.userId];
  const who = await senderDisplayName(session);

  await col.updateOne(
    { coupleId: session.coupleId, week },
    { $set: { coupleId: session.coupleId, week, [`ratings.${session.userId}`]: { name: who, value: v, at: new Date().toISOString() } } },
    { upsert: true },
  );

  const after = (await col.findOne({ coupleId: session.coupleId, week })) as CheckinDoc | null;
  if (!hadMine) {
    broadcastToCouple(session.coupleId, { type: "checkin:done", userId: session.userId, name: who, week });
  }
  const history = await buildHistory(session.coupleId, week);
  return NextResponse.json(viewFor(after, session.userId, week, history));
});
