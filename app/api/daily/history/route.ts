import { NextResponse } from "next/server";
import { getCol } from "@/lib/mongo";
import { withAuth } from "@/lib/apiHandler";
import { READ_CACHE_HEADERS } from "@/lib/cacheHeaders";
import { todayKey } from "@/lib/dailyQuestions";

/**
 * Archive of past daily questions — only days BOTH partners answered (so the
 * reveal gate still holds: you never see their answer for a day you skipped).
 * Today is excluded; that lives in the live /api/daily view.
 */
interface Answer { name: string; text: string; at: string }
interface DailyDoc {
  date: string;
  questionText: string;
  answers: Record<string, Answer>;
}

export const GET = withAuth(async (_req, session) => {
  const today = todayKey();
  const col = await getCol("dailyAnswers");
  const docs = (await col
    .find({ coupleId: session.coupleId, date: { $lt: today } })
    .sort({ date: -1 })
    .limit(120)
    .toArray()) as unknown as DailyDoc[];

  const history = docs
    .filter((d) => Object.keys(d.answers ?? {}).length >= 2)
    .map((d) => ({
      date: d.date,
      question: d.questionText,
      answers: Object.values(d.answers).map((a) => ({ name: a.name, text: a.text })),
    }));

  return NextResponse.json(history, { headers: READ_CACHE_HEADERS });
});
