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
}
