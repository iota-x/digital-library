import { NextRequest, NextResponse } from "next/server";
import { getSession, type SessionPayload } from "@/lib/auth";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { log } from "@/lib/log";

/**
 * Optional per-handler rate-limit config. Unlike the auth routes (keyed by
 * IP+email), authed routes are keyed by coupleId — it's a 2-person app, so the
 * couple is the natural throttle unit and it survives IP changes / shared NAT.
 */
export interface WithAuthOptions {
  rateLimit?: { scope: string; max: number; windowMs: number };
}

/**
 * Wraps an API handler with session check + structured error logging.
 *
 * Every route used to repeat:
 *   try {
 *     const session = await getSession(req);
 *     if (!session) return NextResponse.json({error:"unauthorized"}, {status:401});
 *     ...
 *   } catch { return NextResponse.json({error:"Failed"}, {status:500}); }
 *
 * Now:
 *   export const GET = withAuth(async (req, session) => { ... });
 *
 * The wrapper logs the route path and error with structured context, so
 * prod-side errors are debuggable instead of opaque "Failed".
 */
export function withAuth<Ctx = unknown>(
  handler: (req: NextRequest, session: SessionPayload, ctx: Ctx) => Promise<NextResponse> | NextResponse,
  options: WithAuthOptions = {},
) {
  return async (req: NextRequest, ctx: Ctx): Promise<NextResponse> => {
    let session: SessionPayload | null;
    try {
      session = await getSession(req);
    } catch (err) {
      log.error({ msg: "session check failed", err, path: new URL(req.url).pathname, method: req.method });
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    if (options.rateLimit) {
      const rl = await rateLimit(req, { ...options.rateLimit, identifier: session.coupleId });
      if (!rl.ok) return tooManyRequests(rl.retryAfter);
    }

    try {
      return await handler(req, session, ctx);
    } catch (err) {
      log.error({
        msg: "api handler threw",
        err,
        path: new URL(req.url).pathname,
        method: req.method,
        coupleId: session.coupleId,
      });
      return NextResponse.json({ error: "internal error" }, { status: 500 });
    }
  };
}
