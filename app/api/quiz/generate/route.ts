import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCol } from "@/lib/mongo";
import { withAuth } from "@/lib/apiHandler";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { aiEnabled, aiGenerateJSON } from "@/lib/ai";
import { QUIZ_PACKS, type QuizQuestion } from "@/lib/quizzes";

/**
 * Generate a fresh quiz pack for the couple and store it under their own
 * `coupleQuizzes`. Uses Claude when ANTHROPIC_API_KEY is set (personalised with
 * their names); otherwise remixes questions from the built-in packs so the
 * "make us a new quiz" button still works with zero AI.
 */

const PACK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    emoji: { type: "string" },
    blurb: { type: "string" },
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { text: { type: "string" }, options: { type: "array", items: { type: "string" } } },
        required: ["text", "options"],
      },
    },
  },
  required: ["title", "emoji", "blurb", "questions"],
} as const;

interface RawQ { text: string; options: string[] }
interface RawPack { title: string; emoji: string; blurb: string; questions: RawQ[] }

function cleanQuestions(raw: RawQ[]): QuizQuestion[] {
  return raw
    .filter((q) => q?.text && Array.isArray(q.options) && q.options.filter(Boolean).length >= 2)
    .slice(0, 6)
    .map((q, i) => ({ id: `q${i + 1}`, text: q.text.trim(), options: q.options.filter(Boolean).slice(0, 4) }));
}

/** Deterministic fallback: remix questions from the built-in packs. */
function remixPack(seed: number): { title: string; emoji: string; blurb: string; questions: QuizQuestion[] } {
  const all = QUIZ_PACKS.flatMap((p) => p.questions);
  let s = seed || 1;
  const a = all.slice();
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  const questions = a.slice(0, 6).map((q, i) => ({ id: `q${i + 1}`, text: q.text, options: q.options.slice(0, 4) }));
  return { title: "a fresh mix 🎲", emoji: "🎲", blurb: "a new shuffle — answer privately to compare", questions };
}

export const POST = withAuth(async (req, session) => {
  const rl = await rateLimit(req, { scope: "quiz-gen", max: 8, windowMs: 60_000, identifier: session.coupleId });
  if (!rl.ok) return tooManyRequests(rl.retryAfter);

  let pack = remixPack(Date.now());

  if (aiEnabled()) {
    const couplesCol = await getCol("couples");
    const couple = await couplesCol.findOne({ _id: new ObjectId(session.coupleId) });
    const partnerName = (session.role === "creator" ? couple?.person2Name : couple?.person1Name) ?? "their partner";
    const system =
      "You write playful 'how in sync are you?' quiz packs for a couple's private app. " +
      "Each question is light, warm, and answerable by both partners independently so they can compare. " +
      "Give exactly 6 questions, each with exactly 4 short multiple-choice options (each option ≤ 5 words with one tasteful emoji). " +
      "The title is ≤ 6 words with one emoji; the blurb is one short sentence.";
    const prompt =
      `Write a fresh couple quiz pack for ${session.name} and ${partnerName}. ` +
      `Make it feel new and a little different from a generic compatibility quiz — but keep it sweet and easy.`;
    const out = await aiGenerateJSON<RawPack>({ system, prompt, schema: PACK_SCHEMA, maxTokens: 1200 });
    const questions = out ? cleanQuestions(out.questions) : [];
    if (out && questions.length >= 4) {
      pack = {
        title: (out.title || "a quiz about us").slice(0, 60),
        emoji: (out.emoji || "💞").slice(0, 4),
        blurb: (out.blurb || "answer privately — we'll reveal where you matched").slice(0, 120),
        questions,
      };
    }
  }

  const quizId = `gen-${Date.now().toString(36)}`;
  const col = await getCol("coupleQuizzes");
  await col.insertOne({
    coupleId: session.coupleId,
    quizId,
    title: pack.title,
    emoji: pack.emoji,
    blurb: pack.blurb,
    questions: pack.questions,
    createdAt: new Date().toISOString(),
  });

  // Keep only the 6 most recent generated packs per couple so the hub stays tidy.
  const extra = (await col.find({ coupleId: session.coupleId }).sort({ createdAt: -1 }).skip(6).toArray()) as { _id: ObjectId }[];
  if (extra.length) await col.deleteMany({ _id: { $in: extra.map((d) => d._id) } });

  return NextResponse.json({ id: quizId, title: pack.title, emoji: pack.emoji, blurb: pack.blurb, total: pack.questions.length });
});
