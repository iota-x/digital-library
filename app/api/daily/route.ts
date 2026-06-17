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
}

function viewFor(doc: DailyDoc | null, date: string, q: { id: number; text: string }, userId: string): DailyView {
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
  };
}

export const GET = withAuth(async (_req, session) => {
  const date = todayKeyUTC();
  const q = questionForDate(date);
  const col = await getCol("dailyAnswers");
  const doc = (await col.findOne({ coupleId: session.coupleId, date })) as DailyDoc | null;
  return NextResponse.json(viewFor(doc, date, q, session.userId));
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

  return NextResponse.json(viewFor(after, date, q, session.userId));
});
