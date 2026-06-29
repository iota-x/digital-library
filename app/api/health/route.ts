import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";

/**
 * Lightweight health check for uptime monitors / load balancers.
 * Pings MongoDB so the check reflects real readiness, not just "process up".
 * Always responds fast; never throws.
 */
export async function GET() {
  let db = "down";
  try {
    const database = await getDb();
    await database.command({ ping: 1 });
    db = "up";
  } catch { /* db stays "down" */ }

  const ok = db === "up";
  return NextResponse.json(
    { status: ok ? "ok" : "degraded", db, time: new Date().toISOString() },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
