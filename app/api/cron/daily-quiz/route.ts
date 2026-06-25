import { NextRequest, NextResponse } from "next/server";
import { getCol } from "@/lib/mongo";
import { sendPushToCouple } from "@/lib/pushNotify";
import { broadcastToCouple } from "@/lib/sseBroadcast";
import { log } from "@/lib/log";
import { buildQuizBatch, replaceGeneratedQuizzes, coupleSlotName } from "@/lib/quizGen";

/**
 * Daily quiz drop — gives each couple a fresh SET of distinct quizzes every 24h
 * (DAILY_QUIZ_COUNT, default 3). The drop REPLACES the previous day's generated
 * set rather than appending, so identical-looking cards never pile up on the
 * hub — there's always exactly today's batch sitting next to the built-in packs.
 *
 * Designed to be hit once a day by an external scheduler (same pattern as
 * /api/cron/reminders):
 *
 *   GET /api/cron/daily-quiz?secret=$CRON_SECRET
 *   — or — header  x-cron-secret: $CRON_SECRET
 *
 * Guarded by CRON_SECRET. Dedup'd per (couple, UTC-day) so running it more than
 * once a day never drops a second batch.
 */

const DAILY_QUIZ_COUNT = Math.max(1, Number(process.env.DAILY_QUIZ_COUNT) || 3);

async function handle(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  const provided = req.nextUrl.searchParams.get("secret") || req.headers.get("x-cron-secret");
  if (provided !== secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const dayKey = new Date().toISOString().slice(0, 10);
  const [couplesCol, sentLog] = await Promise.all([
    getCol("couples"), getCol("dailyQuizSent"),
  ]);
  const couples = await couplesCol.find(
    {},
    { projection: { person1Name: 1, person2Name: 1, person1Nickname: 1, person1NicknameOn: 1, person2Nickname: 1, person2NicknameOn: 1 } },
  ).toArray();

  let generated = 0;
  for (const couple of couples) {
    const coupleId = couple._id.toString();

    // One drop per couple per UTC day — claim the slot first; only the run that
    // newly inserts the key proceeds, so concurrent/extra runs can't double-drop.
    const claim = await sentLog.updateOne(
      { key: `${coupleId}:${dayKey}` },
      { $setOnInsert: { coupleId, dayKey, at: new Date().toISOString() } },
      { upsert: true },
    );
    if (!claim.upsertedId) continue;

    const myName = coupleSlotName(couple as Record<string, unknown>, "person1");
    const partnerName = coupleSlotName(couple as Record<string, unknown>, "person2");
    const packs = await buildQuizBatch({ myName, partnerName }, DAILY_QUIZ_COUNT);
    if (!packs.length) {
      await sentLog.deleteOne({ key: `${coupleId}:${dayKey}` });
      continue;
    }
    const summaries = await replaceGeneratedQuizzes(coupleId, packs);

    for (const s of summaries) broadcastToCouple(coupleId, { type: "quiz:new", quizId: s.id, title: s.title });
    await sendPushToCouple(coupleId, {
      title: "fresh quizzes are ready 🎮",
      body: `${summaries.length} new quizzes today — play them together to see how you matched`,
    });
    generated += summaries.length;
  }

  log.info({ msg: "daily quiz sweep done", couples: couples.length, generated });
  return NextResponse.json({ ok: true, couples: couples.length, generated });
}

export async function GET(req: NextRequest) {
  try { return await handle(req); }
  catch (err) { log.error({ msg: "daily quiz sweep failed", err }); return NextResponse.json({ error: "internal error" }, { status: 500 }); }
}
export const POST = GET;
