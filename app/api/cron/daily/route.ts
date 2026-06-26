import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/log";

/**
 * One daily dispatcher that fans out to every once-a-day sweep, so the whole
 * app needs just a SINGLE scheduled job (Vercel Hobby caps crons at 2, and this
 * keeps room to spare). Vercel Cron hits this path and auto-attaches
 * `Authorization: Bearer $CRON_SECRET`; we also accept the legacy ?secret= /
 * x-cron-secret forms so an external scheduler still works.
 *
 *   Vercel Cron  → /api/cron/daily            (auth via Bearer header)
 *   manual/cron  → /api/cron/daily?secret=…   (or x-cron-secret header)
 *
 * Each sub-sweep stays its own independently-runnable, independently-testable
 * route; we just invoke them with the shared secret.
 */

const JOBS = ["reminders", "daily-quiz", "winback"] as const;

async function handle(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });

  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const provided = req.nextUrl.searchParams.get("secret") || req.headers.get("x-cron-secret") || bearer;
  if (provided !== secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const origin = new URL(req.url).origin;
  const results: Record<string, unknown> = {};
  await Promise.all(JOBS.map(async (job) => {
    try {
      const res = await fetch(`${origin}/api/cron/${job}`, { headers: { "x-cron-secret": secret } });
      results[job] = await res.json().catch(() => ({ status: res.status }));
    } catch (err) {
      log.warn({ msg: "cron dispatch failed", err, job });
      results[job] = { error: "dispatch failed" };
    }
  }));

  log.info({ msg: "daily cron dispatch done", jobs: JOBS });
  return NextResponse.json({ ok: true, results });
}

export async function GET(req: NextRequest) {
  try { return await handle(req); }
  catch (err) { log.error({ msg: "daily cron failed", err }); return NextResponse.json({ error: "internal error" }, { status: 500 }); }
}
export const POST = GET;
