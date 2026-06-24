import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSession, type SessionPayload } from "@/lib/auth";
import { getCol } from "@/lib/mongo";
import { serverEnv } from "@/lib/env";
import { log } from "@/lib/log";

/**
 * Admin authorization — mirrors lib/apiHandler.ts's `withAuth`, but additionally
 * requires the signed-in user's email to be on the ADMIN_EMAILS allow-list.
 *
 * The session JWT only carries {userId, coupleId, name, role} — not the email —
 * so the check resolves the user from Mongo by id and compares their stored
 * email. Fails closed: an empty/unset ADMIN_EMAILS denies everyone, so the
 * dashboard is inert until an operator explicitly opts an email in via env.
 */

/** Lowercased, trimmed set of admin emails from the ADMIN_EMAILS env var. */
export function adminEmailSet(): Set<string> {
  return new Set(
    serverEnv.ADMIN_EMAILS
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** True when the user behind this id has an email on the admin allow-list. */
export async function isAdminUserId(userId: string): Promise<boolean> {
  const allow = adminEmailSet();
  if (allow.size === 0) return false; // fail closed
  let oid: ObjectId;
  try {
    oid = new ObjectId(userId);
  } catch {
    return false;
  }
  const users = await getCol("users");
  const user = await users.findOne({ _id: oid }, { projection: { email: 1 } });
  const email = typeof user?.email === "string" ? user.email.toLowerCase() : "";
  return !!email && allow.has(email);
}

/**
 * Wraps an admin API handler with session + admin-email check + error logging.
 * Returns 401 when unauthenticated, 403 when authenticated but not an admin.
 */
export function withAdmin<Ctx = unknown>(
  handler: (req: NextRequest, session: SessionPayload, ctx: Ctx) => Promise<NextResponse> | NextResponse,
) {
  return async (req: NextRequest, ctx: Ctx): Promise<NextResponse> => {
    let session: SessionPayload | null;
    try {
      session = await getSession(req);
    } catch (err) {
      log.error({ msg: "admin session check failed", err, path: new URL(req.url).pathname });
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    let admin = false;
    try {
      admin = await isAdminUserId(session.userId);
    } catch (err) {
      log.error({ msg: "admin check failed", err, userId: session.userId });
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    try {
      return await handler(req, session, ctx);
    } catch (err) {
      log.error({
        msg: "admin handler threw",
        err,
        path: new URL(req.url).pathname,
        method: req.method,
        userId: session.userId,
      });
      return NextResponse.json({ error: "internal error" }, { status: 500 });
    }
  };
}

/**
 * The content collections an admin can monitor. Each entry names the Mongo
 * collection, a human label, and the ISO-string timestamp field used to order
 * and bucket activity. (All content docs carry `coupleId` + one of these
 * timestamps — see the per-route insert shapes.) Counts, the per-couple
 * detail, and the derived activity feed all iterate this single list.
 */
export interface ContentCollection {
  name: string;
  label: string;
  /** ISO-string field used for time bucketing. `date` collections are YYYY-MM-DD. */
  tsField: string;
}

export const CONTENT_COLLECTIONS: ContentCollection[] = [
  { name: "calendar",      label: "Journal entries", tsField: "date" },
  { name: "capsules",      label: "Time capsules",   tsField: "createdAt" },
  { name: "voicenotes",    label: "Voice notes",     tsField: "createdAt" },
  { name: "loveJar",       label: "Love-jar notes",  tsField: "addedAt" },
  { name: "bucketlist",    label: "Bucket list",     tsField: "addedAt" },
  { name: "watchlist",     label: "Watchlist",       tsField: "addedAt" },
  { name: "doodleGallery", label: "Doodles",         tsField: "createdAt" },
  { name: "dailyAnswers",  label: "Daily answers",   tsField: "date" },
  { name: "checkins",      label: "Check-ins",       tsField: "week" },
  { name: "coupleQuizzes", label: "Quizzes",         tsField: "createdAt" },
];
