import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCol } from "@/lib/mongo";
import { withAuth } from "@/lib/apiHandler";
import { daysTogether, DEFAULT_START_DATE } from "@/lib/relationship";
import { getQuizPack } from "@/lib/quizzes";

/**
 * "Us, Wrapped" — a recap of the couple's story so far, computed entirely from
 * what they've already put in the app (journal, daily questions, quizzes, jar,
 * bucket list, watchlist…). No AI needed; it's their own data, counted up and
 * told back to them as story cards on /wrapped.
 */

const DAY_MS = 86_400_000;
const addDays = (key: string, n: number) =>
  new Date(Date.parse(`${key}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

/** Longest run of consecutive calendar days present in the set. */
function longestStreak(dateKeys: string[]): number {
  const set = new Set(dateKeys);
  let best = 0;
  for (const k of set) {
    if (set.has(addDays(k, -1))) continue; // only count from a run's start
    let len = 0, cur = k;
    while (set.has(cur)) { len++; cur = addDays(cur, 1); }
    if (len > best) best = len;
  }
  return best;
}

interface CalEntry { date: string; note?: string; photos?: string[]; special?: boolean; mood?: string }
interface DailyDoc { date: string; answers?: Record<string, unknown> }
interface QuizDoc { quizId: string; answers?: Record<string, { picks?: Record<string, number> }> }

export const GET = withAuth(async (_req, session) => {
  const coupleId = session.coupleId;

  const couplesCol = await getCol("couples");
  const couple = await couplesCol.findOne({ _id: new ObjectId(coupleId) });
  const startDate: string = couple?.startDate ?? DEFAULT_START_DATE;
  const isCreator = session.role === "creator";
  // Refer to each person by their nickname (when switched on), matching the
  // rest of the app. A person's nickname lives on their own person slot.
  const mySlot = isCreator ? "person1" : "person2";
  const partnerSlot = isCreator ? "person2" : "person1";
  const youName: string = couple?.[`${mySlot}NicknameOn`] && couple?.[`${mySlot}Nickname`]
    ? couple[`${mySlot}Nickname`] : session.name;
  const partnerName: string = couple?.[`${partnerSlot}NicknameOn`] && couple?.[`${partnerSlot}Nickname`]
    ? couple[`${partnerSlot}Nickname`]
    : ((isCreator ? couple?.person2Name : couple?.person1Name) ?? "your person");
  const coupleName: string = couple?.settings?.coupleName ?? "";

  const [calCol, dailyCol, quizCol, jarCol, bucketCol, watchCol, voiceCol, capsuleCol] = await Promise.all([
    getCol("calendar"), getCol("dailyAnswers"), getCol("quizRounds"), getCol("loveJar"),
    getCol("bucketlist"), getCol("watchlist"), getCol("voicenotes"), getCol("capsules"),
  ]);

  // ── Journal ──
  // note/mood are end-to-end encrypted, so the server only sees ciphertext.
  // Counts and streaks still work (an encrypted note is still a non-empty note),
  // but the *top mood* must be tallied client-side from decrypted data — see
  // components/Wrapped.tsx. We return null for it here.
  const cal = (await calCol.find({ coupleId }).toArray()) as unknown as CalEntry[];
  const journaled = cal.filter((e) => (e.note && e.note.trim()) || (e.photos?.length ?? 0) > 0);
  const photos = cal.reduce((n, e) => n + (e.photos?.length ?? 0), 0);
  const specialDays = cal.filter((e) => e.special).length;
  const journalStreak = longestStreak(journaled.map((e) => e.date));

  // ── Daily question ──
  const daily = (await dailyCol.find({ coupleId }).toArray()) as unknown as DailyDoc[];
  const bothDays = daily.filter((d) => Object.keys(d.answers ?? {}).length >= 2);
  const dailyStreak = longestStreak(bothDays.map((d) => d.date));

  // ── Quizzes ──
  const quizzes = (await quizCol.find({ coupleId }).toArray()) as unknown as QuizDoc[];
  let quizzesPlayed = 0, bestMatched = 0, bestTotal = 0;
  for (const doc of quizzes) {
    const entries = Object.values(doc.answers ?? {});
    const pack = getQuizPack(doc.quizId);
    if (!pack || entries.length < 2) continue;
    const [a, b] = entries;
    const complete = pack.questions.every(
      (q) => typeof a.picks?.[q.id] === "number" && typeof b.picks?.[q.id] === "number",
    );
    if (!complete) continue;
    quizzesPlayed++;
    const matched = pack.questions.reduce((n, q) => n + (a.picks![q.id] === b.picks![q.id] ? 1 : 0), 0);
    if (bestTotal === 0 || matched / pack.questions.length > bestMatched / (bestTotal || 1)) {
      bestMatched = matched; bestTotal = pack.questions.length;
    }
  }

  // ── Counts ──
  const [jarCount, bucketTotal, bucketDone, watchTotal, watchDone, voiceCount, capsuleCount] = await Promise.all([
    jarCol.countDocuments({ coupleId }),
    bucketCol.countDocuments({ coupleId }),
    bucketCol.countDocuments({ coupleId, completed: true }),
    watchCol.countDocuments({ coupleId }),
    watchCol.countDocuments({ coupleId, status: "completed" }),
    voiceCol.countDocuments({ coupleId }),
    capsuleCol.countDocuments({ coupleId }),
  ]);

  return NextResponse.json({
    names: { you: youName, partner: partnerName },
    coupleName,
    startDate,
    daysTogether: daysTogether(startDate),
    journal: {
      entries: journaled.length,
      photos,
      specialDays,
      topMood: null,        // computed client-side from decrypted moods
      topMoodCount: 0,
      longestStreak: journalStreak,
    },
    daily: { answeredTogether: bothDays.length, longestStreak: dailyStreak },
    quizzes: { played: quizzesPlayed, bestMatched, bestTotal },
    loveJar: jarCount,
    bucket: { total: bucketTotal, done: bucketDone },
    watch: { total: watchTotal, done: watchDone },
    voiceNotes: voiceCount,
    capsules: capsuleCount,
    generatedAt: new Date().toISOString(),
  });
});
