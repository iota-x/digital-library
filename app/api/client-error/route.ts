import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { recordError } from "@/lib/errorLog";

/**
 * Client-side error beacon. The app-level error boundary (app/error.tsx) posts
 * here so render/runtime errors in the browser land in the admin Health view —
 * not just server errors. Best-effort and silent.
 */
export async function POST(req: NextRequest) {
  try {
    const rl = await rateLimit(req, { scope: "track:client-error", max: 30, windowMs: 60_000 });
    if (!rl.ok) return NextResponse.json({ ok: true });

    const body = (await req.json().catch(() => ({}))) as { message?: string; stack?: string; path?: string; digest?: string };
    if (!body.message) return NextResponse.json({ ok: true });

    const session = await getSession(req).catch(() => null);
    await recordError({
      message: body.message,
      name: body.digest ? `client (${body.digest})` : "client",
      stack: body.stack,
      path: typeof body.path === "string" ? body.path.slice(0, 200) : undefined,
      coupleId: session?.coupleId,
      source: "client",
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
