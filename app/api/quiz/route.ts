import { NextResponse } from "next/server";
import { getCol } from "@/lib/mongo";
import { withAuth } from "@/lib/apiHandler";
import { broadcastToCouple } from "@/lib/sseBroadcast";
import { sendPushToOtherInCouple } from "@/lib/pushNotify";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { getQuizPack, QUIZ_PACKS, type QuizPack } from "@/lib/quizzes";
import { senderDisplayName } from "@/lib/displayName";

/** A pack id resolves to either a built-in pack or one this couple generated. */
async function resolvePack(coupleId: string, quizId: string): Promise<QuizPack | null> {
  const builtin = getQuizPack(quizId);
  if (builtin) return builtin;
  const col = await getCol("coupleQuizzes");
  const doc = (await col.findOne({ coupleId, quizId })) as
    | { quizId: string; title: string; emoji: string; blurb: string; questions: QuizPack["questions"] }
    | null;
  if (!doc) return null;
  return { id: doc.quizId, title: doc.title, emoji: doc.emoji, blurb: doc.blurb, questions: doc.questions };
}

interface CouplePackDoc { quizId: string; title: string; emoji: string; blurb: string; questions: QuizPack["questions"]; createdAt?: string }

/**
 * Couple quiz — both partners answer a pack privately; picks reveal (and a
 * "you matched X/N" score is computed) only once BOTH have completed every
 * question. Same reveal-gate philosophy as the daily question: the partner's
 * picks are never sent over the wire until you've finished too.
 */
interface QuizEntry { name: string; picks: Record<string, number>; at: string }
interface QuizDoc {
  coupleId: string;
  quizId: string;
  answers: Record<string, QuizEntry>;
}

function isComplete(pack: QuizPack, picks: Record<string, number> | undefined): boolean {
  if (!picks) return false;
  return pack.questions.every((q) => typeof picks[q.id] === "number");
}

function viewFor(pack: QuizPack, doc: QuizDoc | null, userId: string) {
  const answers = doc?.answers ?? {};
  const mine = answers[userId] ?? null;
  const partnerEntry = Object.entries(answers).find(([uid]) => uid !== userId) ?? null;
  const myComplete = isComplete(pack, mine?.picks);
  const partnerComplete = isComplete(pack, partnerEntry?.[1].picks);
  const revealed = myComplete && partnerComplete;
  const total = pack.questions.length;
  let score: number | null = null;
  if (revealed && mine && partnerEntry) {
    score = pack.questions.reduce(
      (n, q) => n + (mine.picks[q.id] === partnerEntry[1].picks[q.id] ? 1 : 0),
      0,
    );
  }
  return {
    quizId: pack.id,
    title: pack.title,
    emoji: pack.emoji,
    blurb: pack.blurb,
    questions: pack.questions,
    mine: mine?.picks ?? {},
    myComplete,
    partnerComplete,
    revealed,
    partnerName: partnerEntry?.[1].name ?? null,
    partnerPicks: revealed && partnerEntry ? partnerEntry[1].picks : null,
    matchPerQuestion:
      revealed && mine && partnerEntry
        ? Object.fromEntries(pack.questions.map((q) => [q.id, mine.picks[q.id] === partnerEntry[1].picks[q.id]]))
        : null,
    score,
    total,
  };
}

/** GET /api/quiz            → list of packs (no answers)
 *  GET /api/quiz?quiz=<id>   → full round view for that pack */
export const GET = withAuth(async (req, session) => {
  const quizId = new URL(req.url).searchParams.get("quiz");
  if (!quizId) {
    // Lightweight catalog for the hub — built-in packs plus any this couple
    // generated, each with whether it's been revealed.
    const [roundsCol, genCol] = await Promise.all([getCol("quizRounds"), getCol("coupleQuizzes")]);
    const docs = (await roundsCol.find({ coupleId: session.coupleId }).toArray()) as unknown as QuizDoc[];
    const byId = new Map(docs.map((d) => [d.quizId, d]));
    const genDocs = (await genCol.find({ coupleId: session.coupleId }).sort({ createdAt: -1 }).toArray()) as unknown as CouplePackDoc[];
    const genPacks: QuizPack[] = genDocs.map((d) => ({ id: d.quizId, title: d.title, emoji: d.emoji, blurb: d.blurb, questions: d.questions }));
    const all = [...genPacks, ...QUIZ_PACKS];
    return NextResponse.json(
      all.map((p) => {
        const v = viewFor(p, byId.get(p.id) ?? null, session.userId);
        return { id: p.id, title: p.title, emoji: p.emoji, blurb: p.blurb, total: p.questions.length, myComplete: v.myComplete, partnerComplete: v.partnerComplete, revealed: v.revealed, score: v.score, generated: p.id.startsWith("gen-") };
      }),
    );
  }
  const pack = await resolvePack(session.coupleId, quizId);
  if (!pack) return NextResponse.json({ error: "unknown quiz" }, { status: 404 });
  const col = await getCol("quizRounds");
  const doc = (await col.findOne({ coupleId: session.coupleId, quizId })) as QuizDoc | null;
  return NextResponse.json(viewFor(pack, doc, session.userId));
});

/** POST /api/quiz { quizId, picks } — submit my full set of picks for a pack. */
export const POST = withAuth(async (req, session) => {
  const rl = await rateLimit(req, { scope: "quiz", max: 30, windowMs: 60_000, identifier: session.userId });
  if (!rl.ok) return tooManyRequests(rl.retryAfter);

  const body = (await req.json().catch(() => ({}))) as { quizId?: string; picks?: Record<string, number> };
  const pack = body.quizId ? await resolvePack(session.coupleId, body.quizId) : null;
  if (!pack) return NextResponse.json({ error: "unknown quiz" }, { status: 400 });

  // Sanitize: keep only known question ids with an in-range option index.
  const picks: Record<string, number> = {};
  for (const q of pack.questions) {
    const v = body.picks?.[q.id];
    if (typeof v === "number" && v >= 0 && v < q.options.length) picks[q.id] = Math.floor(v);
  }
  if (!isComplete(pack, picks)) {
    return NextResponse.json({ error: "answer every question first" }, { status: 400 });
  }

  const col = await getCol("quizRounds");
  const before = (await col.findOne({ coupleId: session.coupleId, quizId: pack.id })) as QuizDoc | null;
  const partnerWasComplete = Object.entries(before?.answers ?? {}).some(
    ([uid, e]) => uid !== session.userId && isComplete(pack, e.picks),
  );
  const iWasComplete = isComplete(pack, before?.answers?.[session.userId]?.picks);
  const who = await senderDisplayName(session);

  await col.updateOne(
    { coupleId: session.coupleId, quizId: pack.id },
    {
      $set: {
        coupleId: session.coupleId,
        quizId: pack.id,
        [`answers.${session.userId}`]: { name: who, picks, at: new Date().toISOString() },
      },
    },
    { upsert: true },
  );

  const after = (await col.findOne({ coupleId: session.coupleId, quizId: pack.id })) as QuizDoc | null;
  const view = viewFor(pack, after, session.userId);

  // Only nudge the partner on a *new* completion (not on re-submits/edits).
  if (!iWasComplete) {
    if (partnerWasComplete) {
      broadcastToCouple(session.coupleId, { type: "quiz:reveal", quizId: pack.id, userId: session.userId });
      sendPushToOtherInCouple(session.coupleId, session.userId, {
        title: "your quiz results are in 💞",
        body: `${who} finished "${pack.title}" — tap to see how you matched`,
      });
    } else {
      broadcastToCouple(session.coupleId, { type: "quiz:answered", quizId: pack.id, userId: session.userId, name: who });
      sendPushToOtherInCouple(session.coupleId, session.userId, {
        title: "a quiz is waiting 💭",
        body: `${who} played "${pack.title}" — play it too to reveal your score`,
      });
    }
  }

  return NextResponse.json(view);
});

/** DELETE /api/quiz { quizId } — clear the round so you can play it fresh. */
export const DELETE = withAuth(async (req, session) => {
  const body = (await req.json().catch(() => ({}))) as { quizId?: string };
  const pack = body.quizId ? await resolvePack(session.coupleId, body.quizId) : null;
  if (!pack) return NextResponse.json({ error: "unknown quiz" }, { status: 400 });
  const col = await getCol("quizRounds");
  await col.deleteOne({ coupleId: session.coupleId, quizId: pack.id });
  broadcastToCouple(session.coupleId, { type: "quiz:reset", quizId: pack.id, userId: session.userId });
  return NextResponse.json({ ok: true });
});
