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

// Names live on the couple doc (not encrypted). Bucket-list / watchlist text IS
// end-to-end encrypted, so the server can't read it — the client passes those in
// (already decrypted) on the POST path. See components/Ideas.tsx.
async function nameContext(coupleId: string, role: string, myName: string) {
  const couplesCol = await getCol("couples");
  const couple = await couplesCol.findOne({ _id: new ObjectId(coupleId) });
  const mySlot = role === "creator" ? "person1" : "person2";
  const partnerSlot = role === "creator" ? "person2" : "person1";
  const myDisplay = couple?.[`${mySlot}NicknameOn`] && couple?.[`${mySlot}Nickname`]
    ? couple[`${mySlot}Nickname`] : myName;
  const partnerName = couple?.[`${partnerSlot}NicknameOn`] && couple?.[`${partnerSlot}Nickname`]
    ? couple[`${partnerSlot}Nickname`]
    : ((role === "creator" ? couple?.person2Name : couple?.person1Name) ?? "their partner");
  return [myDisplay, partnerName] as [string, string];
}

function cleanList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .map((s) => s.trim().slice(0, 120)).slice(0, 6);
}

async function generate(
  mode: IdeaMode, seed: number, coupleId: string, role: string, myName: string,
  bucket: string[], watch: string[],
) {
  const fallback = pickIdeas(mode, 3, seed);
  if (!aiEnabled()) return { mode, source: "library", ideas: fallback };

  const [you, partner] = await nameContext(coupleId, role, myName);
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
    `The couple is ${you} and ${partner}.\n` +
    (bucket.length ? `Things on their bucket list: ${bucket.join("; ")}.\n` : "") +
    (watch.length ? `On their watchlist: ${watch.join("; ")}.\n` : "") +
    `Make at least one nod to their own lists if relevant, but keep them all easy to do soon.`;

  const out = await aiGenerateJSON<{ ideas: Idea[] }>({ system, prompt, schema: IDEAS_SCHEMA, maxTokens: 700 });
  const ideas = (out?.ideas ?? []).filter((i) => i?.title && i?.blurb).slice(0, 3);
  return ideas.length ? { mode, source: "ai", ideas } : { mode, source: "library", ideas: fallback };
}

// GET — library or names-only personalization (no encrypted content available).
export const GET = withAuth(async (req, session) => {
  const url = new URL(req.url);
  const mode: IdeaMode = url.searchParams.get("mode") === "reconnect" ? "reconnect" : "date";
  const seed = Number(url.searchParams.get("seed")) || Date.now();
  return NextResponse.json(await generate(mode, seed, session.coupleId, session.role, session.name, [], []));
});

// POST — the client sends its decrypted bucket list / watchlist for richer,
// still-private personalization (content reaches the AI but is never stored).
export const POST = withAuth(async (req, session) => {
  const body = (await req.json().catch(() => ({}))) as { mode?: string; seed?: number; bucket?: unknown; watch?: unknown };
  const mode: IdeaMode = body.mode === "reconnect" ? "reconnect" : "date";
  const seed = Number(body.seed) || Date.now();
  return NextResponse.json(
    await generate(mode, seed, session.coupleId, session.role, session.name, cleanList(body.bucket), cleanList(body.watch)),
  );
});
