import { NextRequest, NextResponse } from "next/server";

const COOKIE  = "ann_auth";
const MAX_AGE = 60 * 60 * 24 * 60; // 60 days

export async function GET(req: NextRequest) {
  return NextResponse.json({ ok: req.cookies.get(COOKIE)?.value === "1" });
}

export async function POST(req: NextRequest) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  const expected = process.env.APP_PASSWORD;
  if (!expected || password !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "1", {
    httpOnly: true,
    sameSite: "strict",
    maxAge: MAX_AGE,
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE);
  return res;
}
