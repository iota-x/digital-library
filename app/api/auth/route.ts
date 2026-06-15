import { NextRequest, NextResponse } from "next/server";
import { getSession, clearSessionCookie } from "@/lib/auth";

// GET — check if session exists (used by PasswordGate)
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  return NextResponse.json({ ok: !!session });
}

// DELETE — logout (clear ann_session cookie)
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
