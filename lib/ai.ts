import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Claude-optional helper.
 *
 * Everything in the app works without AI — the ideas/quiz features ship a
 * deterministic content library and only *upgrade* to Claude when a key is
 * present. So this module is built to degrade gracefully: if there's no
 * `ANTHROPIC_API_KEY`, `aiEnabled()` is false and callers use their fallback;
 * if a call fails for any reason, we return null and the caller falls back too.
 *
 * Set `ANTHROPIC_API_KEY` to turn it on. Optionally override the model with
 * `ANTHROPIC_MODEL` (defaults to Claude Opus 4.8). Keep this server-only — it
 * holds the API key and must never reach the client bundle.
 */

export function aiEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!aiEnabled()) return null;
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

interface GenerateOpts {
  system: string;
  prompt: string;
  /** JSON Schema the model's output is constrained to (structured outputs). */
  schema: Record<string, unknown>;
  maxTokens?: number;
}

/**
 * Generate a JSON value from Claude, constrained to `schema`. Returns the
 * parsed value, or null if AI is disabled or anything goes wrong — callers
 * MUST handle null by falling back to deterministic content.
 */
export async function aiGenerateJSON<T>(opts: GenerateOpts): Promise<T | null> {
  const c = getClient();
  if (!c) return null;
  try {
    const res = await c.messages.create({
      model: MODEL,
      max_tokens: opts.maxTokens ?? 1500,
      system: opts.system,
      messages: [{ role: "user", content: opts.prompt }],
      // Structured outputs guarantee schema-valid JSON; low effort keeps these
      // light creative generations cheap and snappy.
      output_config: {
        format: { type: "json_schema", schema: opts.schema },
        effort: "low",
      },
    } as Anthropic.MessageCreateParamsNonStreaming);

    const text = res.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
