import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin";

// GET — only reachable when withAdmin passes, so this confirms admin access to
// the dashboard page. The page calls it on mount to gate its render.
export const GET = withAdmin(async (_req, session) => {
  return NextResponse.json({ ok: true, isAdmin: true, name: session.name });
});
