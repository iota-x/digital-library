import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin";
import { getCol } from "@/lib/mongo";

export const GET = withAdmin(async () => {
  const errors = await getCol("errors");
  const cutoff24h = new Date(Date.now() - 86_400_000);
  const cutoff7d = new Date(Date.now() - 7 * 86_400_000);

  const [count24h, count7d, recent, topAgg] = await Promise.all([
    errors.countDocuments({ at: { $gte: cutoff24h } }),
    errors.countDocuments({ at: { $gte: cutoff7d } }),
    errors.find({}).sort({ at: -1 }).limit(50).toArray(),
    errors.aggregate<{ _id: string; n: number; last: Date }>([
      { $match: { at: { $gte: cutoff7d } } },
      { $group: { _id: "$message", n: { $sum: 1 }, last: { $max: "$at" } } },
      { $sort: { n: -1 } },
      { $limit: 10 },
    ]).toArray(),
  ]);

  return NextResponse.json({
    ok: true,
    counts: { last24h: count24h, last7d: count7d },
    top: topAgg.map((t) => ({ message: t._id, count: t.n, last: t.last })),
    recent: recent.map((e) => ({
      message: e.message,
      name: e.name ?? null,
      path: e.path ?? null,
      method: e.method ?? null,
      source: e.source ?? "api",
      coupleId: e.coupleId ?? null,
      at: e.at,
    })),
  });
});
