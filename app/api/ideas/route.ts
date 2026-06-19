import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCol } from "@/lib/mongo";
import { withAuth } from "@/lib/apiHandler";
import { aiEnabled, aiGenerateJSON } from "@/lib/ai";
import { pickIdeas, type Idea, type IdeaMode } from "@/lib/ideas";

/**
 * Date-night & reconnect suggestions.
 *
 * Always returns something (deterministic library). When ANTHROPIC_API_KEY is
 * set, it personalises using the couple's own bucket list, watchlist and names,
 * and falls back to the library if the model call fails.
 */

const IDEAS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    ideas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { title: { type: "string" }, blurb: { type: "string" } },
        required: ["title", "blurb"],
      },
    },
  },
  required: ["ideas"],
} as const;

async function coupleContext(coupleId: string, role: string, myName: string) {
  const [couplesCol, bucketCol, watchCol] = await Promise.all([
    getCol("couples"), getCol("bucketlist"), getCol("watchlist"),
  ]);
  const couple = await couplesCol.findOne({ _id: new ObjectId(coupleId) });
  const partnerName = (role === "creator" ? couple?.person2Name : couple?.person1Name) ?? "their partner";
  const bucket = (await bucketCol.find({ coupleId, completed: { $ne: true } }).limit(6).toArray())
    .map((b) => (b as { text?: string }).text).filter(Boolean);
  const watch = (await watchCol.find({ coupleId, status: "plan-to-watch" }).limit(6).toArray())
    .map((w) => (w as { title?: string }).title).filter(Boolean);
  return { names: [myName, partnerName], bucket, watch };
}

export const GET = withAuth(async (req, session) => {
  const url = new URL(req.url);
  const mode: IdeaMode = url.searchParams.get("mode") === "reconnect" ? "reconnect" : "date";
  const seed = Number(url.searchParams.get("seed")) || Date.now();

  const fallback = pickIdeas(mode, 3, seed);

  if (!aiEnabled()) {
    return NextResponse.json({ mode, source: "library", ideas: fallback });
  }

  const ctx = await coupleContext(session.coupleId, session.role, session.name);
  const flavour =
    mode === "date"
      ? "fun, doable date-night ideas for a couple"
      : "small, gentle ways for a couple to reconnect and feel close";
  const system =
    "You suggest warm, specific, low-pressure ideas for a couple's private relationship app. " +
    "Keep each title under 6 words with one tasteful emoji, and each blurb a single short sentence. " +
    "Be doable and kind — never cheesy or expensive. Return exactly 3 ideas.";
  const prompt =
    `Suggest 3 ${flavour}.\n` +
    `The couple is ${ctx.names[0]} and ${ctx.names[1]}.\n` +
    (ctx.bucket.length ? `Things on their bucket list: ${ctx.bucket.join("; ")}.\n` : "") +
    (ctx.watch.length ? `On their watchlist: ${ctx.watch.join("; ")}.\n` : "") +
    `Make at least one nod to their own lists if relevant, but keep them all easy to do soon.`;

  const out = await aiGenerateJSON<{ ideas: Idea[] }>({ system, prompt, schema: IDEAS_SCHEMA, maxTokens: 700 });
  const ideas = (out?.ideas ?? []).filter((i) => i?.title && i?.blurb).slice(0, 3);
  if (ideas.length === 0) {
    return NextResponse.json({ mode, source: "library", ideas: fallback });
  }
  return NextResponse.json({ mode, source: "ai", ideas });
});
