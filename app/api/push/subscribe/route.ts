import { NextResponse } from "next/server";
import { getCol } from "@/lib/mongo";
import { withAuth } from "@/lib/apiHandler";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";

export const POST = withAuth(async (req, session) => {
  // Cap subscription churn — 10 subscribes per user per hour
  const rl = await rateLimit(req, { scope: "push:subscribe", max: 10, windowMs: 60 * 60_000, identifier: session.userId });
  if (!rl.ok) return tooManyRequests(rl.retryAfter, "Subscription rate limit exceeded.");

  const subscription = await req.json();
  if (!subscription?.endpoint || typeof subscription.endpoint !== "string") {
    return NextResponse.json({ error: "Invalid subscription payload" }, { status: 400 });
  }

  const col = await getCol("pushSubscriptions");

  // Dedupe by endpoint — a device that re-subscribes shouldn't create a 2nd doc.
  // If another userId already owns this endpoint, transfer ownership (user changed accounts on the device).
  await col.updateOne(
    { "subscription.endpoint": subscription.endpoint },
    { $set: { userId: session.userId, coupleId: session.coupleId, subscription, updatedAt: new Date() } },
    { upsert: true }
  );

  // Cap per-user devices to 10 — drop the oldest if exceeded
  const all = await col
    .find({ userId: session.userId })
    .sort({ updatedAt: -1 })
    .toArray();
  if (all.length > 10) {
    const toDrop = all.slice(10).map(d => d._id);
    await col.deleteMany({ _id: { $in: toDrop } });
  }

  return NextResponse.json({ ok: true });
});

export const DELETE = withAuth(async (req, session) => {
  const body = await req.json().catch(() => ({}));
  const col = await getCol("pushSubscriptions");
  if (body?.endpoint) {
    await col.deleteOne({ userId: session.userId, "subscription.endpoint": body.endpoint });
  } else {
    // Default: drop all subs for this user
    await col.deleteMany({ userId: session.userId });
  }
  return NextResponse.json({ ok: true });
});
