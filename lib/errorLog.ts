import { getCol } from "@/lib/mongo";
import { log } from "@/lib/log";

/**
 * Persist errors so the admin "Health" view can surface breakage without anyone
 * tailing server logs. Complements (does not replace) `log.error` — callers
 * still log to the console; this just durably records the same signal.
 *
 * Best-effort: a logging failure must never mask the original error, so the
 * insert is wrapped and swallowed. Stored with a BSON Date so the TTL index can
 * reap old rows (see lib/ensureIndexes.ts).
 */

export type ErrorSource = "api" | "client";

export interface ErrorFields {
  message: string;
  name?: string;
  stack?: string;
  path?: string;
  method?: string;
  coupleId?: string;
  source: ErrorSource;
}

export async function recordError(fields: ErrorFields): Promise<void> {
  try {
    const col = await getCol("errors");
    await col.insertOne({
      ...fields,
      message: fields.message.slice(0, 1000),
      stack: fields.stack?.slice(0, 4000),
      at: new Date(),
    });
  } catch (err) {
    log.warn({ msg: "recordError failed (non-fatal)", err });
  }
  // Fire a real-time alert so breakage is known in minutes, not whenever someone
  // checks the admin Health view. No-op unless ERROR_WEBHOOK_URL is set.
  void alertWebhook(fields);
}

// Per-instance throttle so a hot error loop can't spam the channel. Keyed by
// route+message, one alert per key per window.
const ALERT_WINDOW_MS = 10 * 60_000;
const lastAlerted = new Map<string, number>();

async function alertWebhook(fields: ErrorFields): Promise<void> {
  const url = process.env.ERROR_WEBHOOK_URL;
  if (!url) return;
  try {
    const key = `${fields.path ?? ""}|${fields.message.slice(0, 120)}`;
    const now = Date.now();
    const prev = lastAlerted.get(key) ?? 0;
    if (now - prev < ALERT_WINDOW_MS) return;
    lastAlerted.set(key, now);
    if (lastAlerted.size > 500) lastAlerted.clear(); // bound memory

    const where = [fields.method, fields.path].filter(Boolean).join(" ");
    const text = `🚨 *Us* ${fields.source} error${where ? ` — \`${where}\`` : ""}\n${fields.name ? `${fields.name}: ` : ""}${fields.message.slice(0, 400)}${fields.coupleId ? `\ncouple: ${fields.coupleId}` : ""}`;

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    // Send both keys so the same URL works for Discord (`content`) and Slack (`text`).
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, text }),
      signal: ctrl.signal,
    }).finally(() => clearTimeout(t));
  } catch (err) {
    log.warn({ msg: "error webhook failed (non-fatal)", err });
  }
}
