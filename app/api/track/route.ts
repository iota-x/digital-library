import { NextRequest, NextResponse } from "next/server";
import { getCol } from "@/lib/mongo";
import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { reqMeta } from "@/lib/events";

/**
 * Page-view beacon. Called client-side on each route change (see
 * components/PageviewTracker.tsx). Not behind withAuth — it must accept
 * pre-login visits too — but it attaches the session's couple when present.
 * Best-effort and silent: tracking must never surface an error to a user.
 */
export async function POST(req: NextRequest) {
  try {
    // Light cap so a misbehaving client can't flood the collection.
    const rl = await rateLimit(req, { scope: "track:pageview", max: 120, windowMs: 60_000 });
    if (!rl.ok) return NextResponse.json({ ok: true }); // silently drop, don't 429 a beacon

    const { path } = (await req.json().catch(() => ({}))) as { path?: string };
    if (!path || typeof path !== "string") return NextResponse.json({ ok: true });

    // Normalize: drop query/hash, cap length, ignore admin/asset noise.
    const clean = path.split(/[?#]/)[0].slice(0, 200);
    if (!clean.startsWith("/") || clean.startsWith("/admin") || clean.startsWith("/api")) {
      return NextResponse.json({ ok: true });
    }

    const session = await getSession(req).catch(() => null);
    const { ip, userAgent } = reqMeta(req);

    const col = await getCol("pageviews");
    await col.insertOne({
      path: clean,
      coupleId: session?.coupleId ?? null,
      userId: session?.userId ?? null,
      ip,
      userAgent,
      at: new Date(),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
