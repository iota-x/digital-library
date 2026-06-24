import type { NextRequest } from "next/server";
import { getCol } from "@/lib/mongo";
import { log } from "@/lib/log";

/**
 * Lightweight auth/activity event log.
 *
 * Only records signals that leave no other trace — logins, failed logins, and
 * email verifications. Content activity (journal/voice-note/etc. writes) is NOT
 * logged here: those docs already carry a timestamp, so the admin feed derives
 * that history from the collections directly (retroactive, zero write overhead).
 *
 * Writes are best-effort: a logging failure must never break the request that
 * triggered it, so every insert is wrapped and swallowed (matching the
 * fire-and-forget pattern used for transactional email).
 */

export type EventType = "login" | "login_failed" | "verify_email";

export interface EventFields {
  userId?: string;
  coupleId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
}

/** Extract client IP + user-agent from request headers (first forwarded hop). */
export function reqMeta(req: NextRequest): { ip: string; userAgent: string } {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "";
  const userAgent = req.headers.get("user-agent") ?? "";
  return { ip, userAgent };
}

/** Insert one event. Never throws — failures are logged and swallowed. */
export async function logEvent(type: EventType, fields: EventFields = {}): Promise<void> {
  try {
    const events = await getCol("events");
    await events.insertOne({
      type,
      ...fields,
      at: new Date().toISOString(),
    });
  } catch (err) {
    log.warn({ msg: "logEvent failed (non-fatal)", err, type });
  }
}
