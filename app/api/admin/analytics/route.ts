import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin";
import { getCol } from "@/lib/mongo";
import { parseUA } from "@/lib/ua";
import { lookupIps } from "@/lib/geo";

/** Human label for a path's top-level feature segment. */
function featureLabel(path: string): string {
  const seg = path.split("/").filter(Boolean)[0];
  if (!seg) return "Home";
  const map: Record<string, string> = {
    journal: "Journal", together: "Together", play: "Play", daily: "Daily questions",
    capsule: "Time capsules", timeline: "Timeline", map: "Map", wrapped: "Wrapped",
    widget: "Widget", shared: "Shared",
  };
  return map[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1);
}

const SAMPLE = 5000; // recent pageviews scanned for UA/geo (approximate by design)

export const GET = withAdmin(async () => {
  const pv = await getCol("pageviews");
  const cutoff30d = new Date(Date.now() - 30 * 86_400_000);

  // Top pages + 14-day series + total (accurate, via aggregation) -----------
  const [pathAgg, totalViews, dayAgg] = await Promise.all([
    pv.aggregate<{ _id: string; n: number }>([
      { $match: { at: { $gte: cutoff30d } } },
      { $group: { _id: "$path", n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 25 },
    ]).toArray(),
    pv.countDocuments({ at: { $gte: cutoff30d } }),
    pv.aggregate<{ _id: string; n: number }>([
      { $match: { at: { $gte: new Date(Date.now() - 14 * 86_400_000) } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$at" } }, n: { $sum: 1 } } },
    ]).toArray(),
  ]);

  const topPages = pathAgg.map((p) => ({ path: p._id, views: p.n }));

  // Roll paths up into features.
  const featureMap = new Map<string, number>();
  for (const p of pathAgg) {
    const label = featureLabel(p._id);
    featureMap.set(label, (featureMap.get(label) ?? 0) + p.n);
  }
  const features = [...featureMap.entries()].map(([label, views]) => ({ label, views })).sort((a, b) => b.views - a.views);

  // 14-day series.
  const dayKeys: string[] = [];
  for (let i = 13; i >= 0; i--) dayKeys.push(new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10));
  const dayCounts = new Map(dayAgg.map((d) => [d._id, d.n]));
  const series = dayKeys.map((k) => dayCounts.get(k) ?? 0);

  // Device / browser / OS + geo (approximate, from a recent sample) ---------
  const sample = await pv
    .find({ at: { $gte: cutoff30d } }, { projection: { userAgent: 1, ip: 1 } })
    .sort({ at: -1 })
    .limit(SAMPLE)
    .toArray();

  const deviceTally: Record<string, number> = {};
  const browserTally: Record<string, number> = {};
  const osTally: Record<string, number> = {};
  for (const row of sample) {
    const ua = parseUA(row.userAgent);
    deviceTally[ua.device] = (deviceTally[ua.device] ?? 0) + 1;
    browserTally[ua.browser] = (browserTally[ua.browser] ?? 0) + 1;
    osTally[ua.os] = (osTally[ua.os] ?? 0) + 1;
  }

  const geoMap = await lookupIps(sample.map((r) => String(r.ip ?? "")), 50);
  const countryTally: Record<string, number> = {};
  for (const row of sample) {
    const g = geoMap.get(String(row.ip ?? ""));
    const country = g?.country ?? "Unknown";
    countryTally[country] = (countryTally[country] ?? 0) + 1;
  }

  const toSorted = (t: Record<string, number>) =>
    Object.entries(t).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);

  // Push notifications -----------------------------------------------------
  const subs = await getCol("pushSubscriptions");
  const [pushSubs, pushCouples] = await Promise.all([
    subs.countDocuments(),
    subs.distinct("coupleId").then((ids) => ids.filter(Boolean).length),
  ]);

  return NextResponse.json({
    ok: true,
    totalViews,
    sampleSize: sample.length,
    series: { dayKeys, views: series },
    topPages,
    features,
    devices: toSorted(deviceTally),
    browsers: toSorted(browserTally),
    os: toSorted(osTally),
    countries: toSorted(countryTally),
    push: { subscriptions: pushSubs, couples: pushCouples },
  });
});
