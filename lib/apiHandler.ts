import { NextRequest, NextResponse } from "next/server";
import { getSession, type SessionPayload } from "@/lib/auth";
import { log } from "@/lib/log";

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
