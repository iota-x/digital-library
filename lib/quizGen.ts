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

/** Varied flavours so remixed packs don't all read as an identical "a fresh
 *  mix" card on the hub — each drop gets its own title/blurb. */
const REMIX_FLAVOURS: { title: string; emoji: string; blurb: string }[] = [
  { title: "a fresh shuffle 🎲", emoji: "🎲", blurb: "a brand-new mix — answer privately, then compare" },
  { title: "today's surprise pack 🎁", emoji: "🎁", blurb: "freshly drawn for you two — see where you match" },
  { title: "how in sync today? 💞", emoji: "💞", blurb: "a new set — answer apart, reveal together" },
  { title: "guess we match 🔮", emoji: "🔮", blurb: "pick what you think you'll both land on" },
  { title: "the daily us quiz ☀️", emoji: "☀️", blurb: "today's questions about the two of you" },
  { title: "a little something new ✨", emoji: "✨", blurb: "fresh questions — no peeking at each other" },
  { title: "round two, who's closer? 🎯", emoji: "🎯", blurb: "another shuffle to test how in tune you are" },
  { title: "couple's curveball 🌀", emoji: "🌀", blurb: "a mixed bag — answer honestly, reveal together" },
];

/**
 * Deterministic fallback: build `count` distinct packs by remixing the built-in
 * questions. Packs in one batch never share a question (the shuffled pool is
 * sliced into non-overlapping groups), and `exclude` lets the caller keep them
 * different from packs already made elsewhere in the same run.
 */
function remixBatch(seed: number, count: number, exclude: Set<string> = new Set()): GeneratedPack[] {
  const all = QUIZ_PACKS.flatMap((p) => p.questions).filter((q) => !exclude.has(q.text));
  let s = seed || 1;
  const a = all.slice();
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  const packs: GeneratedPack[] = [];
  for (let p = 0; p < count; p++) {
    const slice = a.slice(p * 6, p * 6 + 6);
    if (slice.length < 4) break; // not enough fresh questions left to fill another pack
    const flavour = REMIX_FLAVOURS[(Math.abs(Math.floor(seed)) + p) % REMIX_FLAVOURS.length];
    packs.push({
      ...flavour,
      questions: slice.map((q, i) => ({ id: `q${i + 1}`, text: q.text, options: q.options.slice(0, 4) })),
    });
  }
  return packs;
}

/** Single deterministic fallback pack (used by the on-demand button). */
function remixPack(seed: number): GeneratedPack {
  const [pack] = remixBatch(seed, 1);
  return pack ?? { title: "a fresh shuffle 🎲", emoji: "🎲", blurb: "a brand-new mix — answer privately to compare", questions: [] };
}

/** Loose themes so a batch of AI packs each comes out distinct. */
const AI_THEMES = [
  "everyday tastes and little preferences",
  "memories and your story so far",
  "the future you're dreaming up together",
  "playful 'who's more likely to' moments",
  "soft, heartfelt, deeper questions",
  "fun this-or-that compatibility",
];

/** One AI-generated pack, optionally nudged toward a theme. Null on failure. */
async function buildAiPack(names: { myName: string; partnerName: string }, theme?: string): Promise<GeneratedPack | null> {
  const system =
    "You write playful 'how in sync are you?' quiz packs for a couple's private app. " +
    "Each question is light, warm, and answerable by both partners independently so they can compare. " +
    "Give exactly 6 questions, each with exactly 4 short multiple-choice options (each option ≤ 5 words with one tasteful emoji). " +
    "The title is ≤ 6 words with one emoji; the blurb is one short sentence.";
  const prompt =
    `Write a fresh couple quiz pack for ${names.myName} and ${names.partnerName}. ` +
    (theme ? `Center it loosely around: ${theme}. ` : "") +
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
  return null;
}

/**
 * Build a fresh quiz pack for a couple. `names` only flavour the AI prompt;
 * generation degrades to a deterministic remix when AI is off or fails.
 */
export async function buildQuizPack(names: { myName: string; partnerName: string }): Promise<GeneratedPack> {
  if (aiEnabled()) {
    const pack = await buildAiPack(names);
    if (pack) return pack;
  }
  return remixPack(Date.now());
}

/**
 * Build `count` distinct quiz packs in one go (for the daily drop). Uses AI when
 * available — a different theme per pack so they don't read alike — and tops up
 * (or fully falls back) with non-overlapping deterministic remixes.
 */
export async function buildQuizBatch(names: { myName: string; partnerName: string }, count: number): Promise<GeneratedPack[]> {
  const packs: GeneratedPack[] = [];
  const used = new Set<string>(); // question texts already used this batch

  if (aiEnabled()) {
    for (let i = 0; i < count; i++) {
      const pack = await buildAiPack(names, AI_THEMES[i % AI_THEMES.length]);
      if (pack) {
        packs.push(pack);
        pack.questions.forEach((q) => used.add(q.text));
      }
    }
  }

  if (packs.length < count) {
    packs.push(...remixBatch(Date.now() + packs.length, count - packs.length, used));
  }
  return packs.slice(0, count);
}

/**
 * Persist a generated pack under the couple's own `coupleQuizzes`, keeping only
 * the 6 most recent so the hub stays tidy. Returns the new pack's id + summary.
 */
export async function insertGeneratedQuiz(coupleId: string, pack: GeneratedPack) {
  const quizId = `gen-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
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

/**
 * Swap the couple's generated quizzes for a fresh `packs` set — the daily drop
 * REPLACES rather than appends, so identical-looking remix cards never pile up
 * on the hub. Returns the new packs' summaries.
 */
export async function replaceGeneratedQuizzes(coupleId: string, packs: GeneratedPack[]) {
  const col = await getCol("coupleQuizzes");
  await col.deleteMany({ coupleId });

  const now = Date.now();
  const docs = packs.map((pack, i) => ({
    coupleId,
    quizId: `gen-${(now + i).toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    title: pack.title,
    emoji: pack.emoji,
    blurb: pack.blurb,
    questions: pack.questions,
    // Stagger timestamps so the hub's createdAt-desc order is stable.
    createdAt: new Date(now + i).toISOString(),
  }));
  if (docs.length) await col.insertMany(docs);

  return docs.map((d) => ({ id: d.quizId, title: d.title, emoji: d.emoji, blurb: d.blurb, total: d.questions.length }));
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
