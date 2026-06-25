import { NextRequest, NextResponse } from "next/server";
import { getCol } from "@/lib/mongo";
import { sendPushToCouple } from "@/lib/pushNotify";
import { broadcastToCouple } from "@/lib/sseBroadcast";
import { log } from "@/lib/log";
import { QUIZ_PACKS, type QuizPack } from "@/lib/quizzes";
import { buildQuizPack, insertGeneratedQuiz, coupleSlotName, isPackComplete } from "@/lib/quizGen";

/**
 * Daily quiz drop — gives each couple ONE fresh quiz a day, but only once
 * they've completed everything currently available to them (the 3 built-in
 * packs plus any previously-generated ones). This keeps a steady "a new quiz a
 * day" rhythm without ever piling up unplayed quizzes.
 *
 * Designed to be hit once a day by an external scheduler (same pattern as
 * /api/cron/reminders):
 *
 *   GET /api/cron/daily-quiz?secret=$CRON_SECRET
 *   — or — header  x-cron-secret: $CRON_SECRET
 *
 * Guarded by CRON_SECRET. Dedup'd per (couple, UTC-day) so running it more than
 * once a day never drops a second quiz — that's what enforces the "1 per day"
 * cap even if a couple blitzes through the new one the same day.
 */

interface QuizEntry { picks: Record<string, number> }
interface QuizDoc { quizId: string; answers: Record<string, QuizEntry> }

/** A pack is "fully played" when both partners have a complete set of picks —
 *  i.e. its round has at least two complete answer entries (a couple is two
 *  people), which is exactly the condition under which it has revealed. */
function bothCompleted(pack: QuizPack, doc: QuizDoc | undefined): boolean {
  if (!doc) return false;
  const complete = Object.values(doc.answers ?? {}).filter((e) => isPackComplete(pack, e.picks));
  return complete.length >= 2;
}

async function handle(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  const provided = req.nextUrl.searchParams.get("secret") || req.headers.get("x-cron-secret");
  if (provided !== secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const dayKey = new Date().toISOString().slice(0, 10);
  const [couplesCol, roundsCol, genCol, sentLog] = await Promise.all([
    getCol("couples"), getCol("quizRounds"), getCol("coupleQuizzes"), getCol("dailyQuizSent"),
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

    // Build the couple's full set of available packs (built-ins + generated).
    // Generated packs are stored keyed by `quizId`, not `id`.
    const genDocs = (await genCol.find({ coupleId }).toArray()) as unknown as
      (Omit<QuizPack, "id"> & { quizId: string })[];
    const availablePacks: QuizPack[] = [...QUIZ_PACKS, ...genDocs.map((d) => ({
      id: d.quizId, title: d.title, emoji: d.emoji, blurb: d.blurb, questions: d.questions,
    }))];

    const rounds = (await roundsCol.find({ coupleId }).toArray()) as unknown as QuizDoc[];
    const roundById = new Map(rounds.map((r) => [r.quizId, r]));

    // Only drop a fresh quiz once nothing is left to play — every available pack
    // must be fully completed by both partners.
    const allDone = availablePacks.every((p) => bothCompleted(p, roundById.get(p.id)));
    if (!allDone) {
      // Release the day claim so a later run today (after they finish what's
      // left) can still drop — being caught up is the real gate, not the date.
      await sentLog.deleteOne({ key: `${coupleId}:${dayKey}` });
      continue;
    }

    const myName = coupleSlotName(couple as Record<string, unknown>, "person1");
    const partnerName = coupleSlotName(couple as Record<string, unknown>, "person2");
    const pack = await buildQuizPack({ myName, partnerName });
    const summary = await insertGeneratedQuiz(coupleId, pack);

    broadcastToCouple(coupleId, { type: "quiz:new", quizId: summary.id, title: summary.title });
    await sendPushToCouple(coupleId, {
      title: "a fresh quiz is ready 🎮",
      body: `today's "${summary.title}" — play it together to see how you matched`,
    });
    generated++;
  }

  log.info({ msg: "daily quiz sweep done", couples: couples.length, generated });
  return NextResponse.json({ ok: true, couples: couples.length, generated });
}

export async function GET(req: NextRequest) {
  try { return await handle(req); }
  catch (err) { log.error({ msg: "daily quiz sweep failed", err }); return NextResponse.json({ error: "internal error" }, { status: 500 }); }
}
export const POST = GET;
