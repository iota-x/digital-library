import "server-only";
import { ObjectId } from "mongodb";
import { getCol } from "@/lib/mongo";
import { aiEnabled, aiGenerateJSON } from "@/lib/ai";
import { QUIZ_PACKS, type QuizQuestion } from "@/lib/quizzes";

/**
 * Shared couple-quiz generation, used by both the manual "make us a new quiz"
 * button (app/api/quiz/generate) and the daily cron (app/api/cron/daily-quiz).
 *
 * Uses Claude when ANTHROPIC_API_KEY is set (personalised with the couple's
 * names); otherwise remixes questions from the built-in packs so generation
 * still works with zero AI.
 */

export interface GeneratedPack {
  title: string;
  emoji: string;
  blurb: string;
  questions: QuizQuestion[];
}

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
function remixPack(seed: number): GeneratedPack {
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

/**
 * Build a fresh quiz pack for a couple. `names` only flavour the AI prompt;
 * generation degrades to a deterministic remix when AI is off or fails.
 */
export async function buildQuizPack(names: { myName: string; partnerName: string }): Promise<GeneratedPack> {
  if (aiEnabled()) {
    const system =
      "You write playful 'how in sync are you?' quiz packs for a couple's private app. " +
      "Each question is light, warm, and answerable by both partners independently so they can compare. " +
      "Give exactly 6 questions, each with exactly 4 short multiple-choice options (each option ≤ 5 words with one tasteful emoji). " +
      "The title is ≤ 6 words with one emoji; the blurb is one short sentence.";
    const prompt =
      `Write a fresh couple quiz pack for ${names.myName} and ${names.partnerName}. ` +
      `Make it feel new and a little different from a generic compatibility quiz — but keep it sweet and easy.`;
    const out = await aiGenerateJSON<RawPack>({ system, prompt, schema: PACK_SCHEMA, maxTokens: 1200 });
    const questions = out ? cleanQuestions(out.questions) : [];
    if (out && questions.length >= 4) {
      return {
        title: (out.title || "a quiz about us").slice(0, 60),
        emoji: (out.emoji || "💞").slice(0, 4),
        blurb: (out.blurb || "answer privately — we'll reveal where you matched").slice(0, 120),
        questions,
      };
    }
  }
  return remixPack(Date.now());
}

/**
 * Persist a generated pack under the couple's own `coupleQuizzes`, keeping only
 * the 6 most recent so the hub stays tidy. Returns the new pack's id + summary.
 */
export async function insertGeneratedQuiz(coupleId: string, pack: GeneratedPack) {
  const quizId = `gen-${Date.now().toString(36)}`;
  const col = await getCol("coupleQuizzes");
  await col.insertOne({
    coupleId,
    quizId,
    title: pack.title,
    emoji: pack.emoji,
    blurb: pack.blurb,
    questions: pack.questions,
    createdAt: new Date().toISOString(),
  });

  const extra = (await col.find({ coupleId }).sort({ createdAt: -1 }).skip(6).toArray()) as { _id: ObjectId }[];
  if (extra.length) await col.deleteMany({ _id: { $in: extra.map((d) => d._id) } });

  return { id: quizId, title: pack.title, emoji: pack.emoji, blurb: pack.blurb, total: pack.questions.length };
}

/** Resolve a couple member's couple-facing name: the nickname their partner
 *  gave them when switched on, otherwise their account name. */
export function coupleSlotName(couple: Record<string, unknown> | null, slot: "person1" | "person2"): string {
  const nick = couple?.[`${slot}Nickname`];
  const on = couple?.[`${slot}NicknameOn`] === true;
  if (on && typeof nick === "string" && nick.trim()) return nick;
  const name = couple?.[`${slot}Name`];
  return typeof name === "string" && name.trim() ? name : "their partner";
}

/** Whether every question in `pack` has an in-range pick. */
export function isPackComplete(pack: { questions: QuizQuestion[] }, picks: Record<string, number> | undefined): boolean {
  if (!picks) return false;
  return pack.questions.every((q) => typeof picks[q.id] === "number");
}
