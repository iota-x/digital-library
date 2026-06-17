import { NextResponse } from "next/server";
import { getCol } from "@/lib/mongo";
import { withAuth } from "@/lib/apiHandler";
import { broadcastToCouple } from "@/lib/sseBroadcast";
import { sendPushToOtherInCouple } from "@/lib/pushNotify";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { todayKeyUTC, questionForDate } from "@/lib/dailyQuestions";

/**
 * Daily question — both partners answer privately; answers reveal only once
 * BOTH have submitted. The reveal gate is enforced server-side: the partner's
 * text is never sent until you've also answered, so it can't be peeked at
 * over the network.
 */
interface Answer { name: string; text: string; at: string }
interface DailyDoc {
  coupleId: string;
  date: string;
  questionId: number;
  questionText: string;
  answers: Record<string, Answer>;
}

interface DailyView {
  date: string;
  question: string;
  questionId: number;
  mine: string | null;
  answeredAt: string | null;
  partnerAnswered: boolean;
  revealed: boolean;
  partner: { name: string; text: string } | null;
  /** Consecutive days (ending today, with a grace day for today) where BOTH
   *  partners answered — the shared "answer streak". */
  streak: number;
}

const DAY_MS = 86_400_000;
const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * Shared answer-streak: count back from today over days where BOTH partners
 * answered (the "revealed" state). Today is given a grace day — it doesn't
 * break the streak just because you haven't both answered yet today.
 */
async function computeStreak(coupleId: string, today: string): Promise<number> {
  const col = await getCol("dailyAnswers");
  const todayMs = Date.parse(`${today}T00:00:00Z`);
  const lower = dayKey(todayMs - 400 * DAY_MS); // bound the scan to ~13 months
  const docs = (await col
    .find({ coupleId, date: { $gte: lower, $lte: today } }, { projection: { date: 1, answers: 1 } })
    .toArray()) as unknown as DailyDoc[];

  const done = new Set(
    docs.filter((d) => Object.keys(d.answers ?? {}).length >= 2).map((d) => d.date),
  );

  let streak = 0;
  let cursor = todayMs;
  if (!done.has(dayKey(cursor))) cursor -= DAY_MS; // grace: today still pending
  while (done.has(dayKey(cursor))) {
    streak++;
    cursor -= DAY_MS;
  }
  return streak;
}

function viewFor(doc: DailyDoc | null, date: string, q: { id: number; text: string }, userId: string, streak: number): DailyView {
  const answers = doc?.answers ?? {};
  const mineEntry = answers[userId] ?? null;
  const partnerEntry = Object.entries(answers).find(([uid]) => uid !== userId) ?? null;
  const partnerAnswered = !!partnerEntry;
  const revealed = !!mineEntry && partnerAnswered;
  return {
    date,
    question: q.text,
    questionId: q.id,
    mine: mineEntry?.text ?? null,
    answeredAt: mineEntry?.at ?? null,
    partnerAnswered,
    revealed,
    partner: revealed && partnerEntry ? { name: partnerEntry[1].name, text: partnerEntry[1].text } : null,
    streak,
  };
}

export const GET = withAuth(async (_req, session) => {
  const date = todayKeyUTC();
  const q = questionForDate(date);
  const col = await getCol("dailyAnswers");
  const doc = (await col.findOne({ coupleId: session.coupleId, date })) as DailyDoc | null;
  const streak = await computeStreak(session.coupleId, date);
  return NextResponse.json(viewFor(doc, date, q, session.userId, streak));
});

export const POST = withAuth(async (req, session) => {
  const rl = await rateLimit(req, { scope: "daily", max: 20, windowMs: 60_000, identifier: session.userId });
  if (!rl.ok) return tooManyRequests(rl.retryAfter);

  const { answer } = (await req.json().catch(() => ({}))) as { answer?: string };
  const text = (answer ?? "").trim().slice(0, 2000);
  if (!text) return NextResponse.json({ error: "answer required" }, { status: 400 });

  const date = todayKeyUTC();
  const q = questionForDate(date);
  const col = await getCol("dailyAnswers");

  const before = (await col.findOne({ coupleId: session.coupleId, date })) as DailyDoc | null;
  const hadMineBefore = !!before?.answers?.[session.userId];

  await col.updateOne(
    { coupleId: session.coupleId, date },
    {
      $set: {
        coupleId: session.coupleId,
        date,
        questionId: q.id,
        questionText: q.text,
        [`answers.${session.userId}`]: { name: session.name, text, at: new Date().toISOString() },
      },
    },
    { upsert: true },
  );

  const after = (await col.findOne({ coupleId: session.coupleId, date })) as DailyDoc | null;
  const bothAnswered = Object.keys(after?.answers ?? {}).length >= 2;

  // Only ping the partner the first time each side answers — editing your own
  // answer afterwards shouldn't re-nudge.
  if (!hadMineBefore) {
    if (bothAnswered) {
      broadcastToCouple(session.coupleId, { type: "daily:reveal", date, userId: session.userId });
      sendPushToOtherInCouple(session.coupleId, session.userId, {
        title: "you can both see it now 💌",
        body: `${session.name} answered today's question — tap to reveal both`,
      });
    } else {
      broadcastToCouple(session.coupleId, { type: "daily:answered", date, userId: session.userId, name: session.name });
      sendPushToOtherInCouple(session.coupleId, session.userId, {
        title: "today's question 💭",
        body: `${session.name} answered — add yours to reveal both`,
      });
    }
  } else if (bothAnswered) {
    // Re-edit after reveal: keep both screens in sync without a push.
    broadcastToCouple(session.coupleId, { type: "daily:reveal", date, userId: session.userId, silent: true });
  }

  const streak = await computeStreak(session.coupleId, date);
  return NextResponse.json(viewFor(after, date, q, session.userId, streak));
});
