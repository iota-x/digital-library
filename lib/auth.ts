import { SignJWT, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";

const COOKIE_NAME = "ann_session";
const MAX_AGE = 60 * 60 * 24 * 60; // 60 days

function getSecret(): Uint8Array {
  return new TextEncoder().encode(serverEnv.JWT_SECRET);
}

export interface SessionPayload {
  userId: string;
  coupleId: string;
  name: string;
  role: "creator" | "partner";
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("60d")
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    maxAge: MAX_AGE,
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
}
