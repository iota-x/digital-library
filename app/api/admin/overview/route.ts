import { NextResponse } from "next/server";
import { withAdmin, CONTENT_COLLECTIONS } from "@/lib/admin";
import { getCol } from "@/lib/mongo";

/** ISO string for `days` ago from now — content/event timestamps are ISO strings,
 *  which sort lexicographically, so a `$gte` string compare is a valid range. */
function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

/** The YYYY-MM-DD keys for the last `n` days, oldest → newest. */
function lastNDayKeys(n: number): string[] {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    keys.push(new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10));
  }
  return keys;
}

/** Bucket a list of ISO timestamps into a per-day count series over `dayKeys`. */
function dailySeries(isoTimes: string[], dayKeys: string[]): number[] {
  const counts = new Map<string, number>(dayKeys.map((k) => [k, 0]));
  for (const t of isoTimes) {
    const k = t.slice(0, 10);
    if (counts.has(k)) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return dayKeys.map((k) => counts.get(k) ?? 0);
}

export const GET = withAdmin(async () => {
  const [couplesCol, usersCol, eventsCol] = await Promise.all([
    getCol("couples"),
    getCol("users"),
    getCol("events"),
  ]);

  const dayKeys = lastNDayKeys(14);
  const cutoff24h = daysAgoISO(1);
  const cutoff7d = daysAgoISO(7);
  const cutoff30d = daysAgoISO(30);
  const cutoff14d = daysAgoISO(14);

  // Accounts ---------------------------------------------------------------
  const [totalCouples, totalUsers, verifiedUsers, unverifiedUsers] = await Promise.all([
    couplesCol.countDocuments(),
    usersCol.countDocuments(),
    usersCol.countDocuments({ emailVerified: { $ne: false } }),
    usersCol.countDocuments({ emailVerified: false }),
  ]);

  // Paired vs solo — a couple is "paired" once it has 2+ member accounts.
  const membersPerCouple = await usersCol
    .aggregate<{ _id: string; n: number }>([{ $group: { _id: "$coupleId", n: { $sum: 1 } } }])
    .toArray();
  const pairedCouples = membersPerCouple.filter((g) => g.n >= 2).length;

  // Signups (from couple.createdAt) ---------------------------------------
  const recentCouples = await couplesCol
    .find({ createdAt: { $gte: cutoff30d } }, { projection: { createdAt: 1 } })
    .toArray();
  const signups7d = recentCouples.filter((c) => c.createdAt >= cutoff7d).length;
  const signups30d = recentCouples.length;
  const signupSeries = dailySeries(
    recentCouples.filter((c) => c.createdAt >= cutoff14d).map((c) => String(c.createdAt)),
    dayKeys,
  );

  // Logins (from events) ---------------------------------------------------
  const recentLogins = await eventsCol
    .find({ type: "login", at: { $gte: cutoff14d } }, { projection: { at: 1 } })
    .toArray();
  const logins24h = recentLogins.filter((e) => e.at >= cutoff24h).length;
  const logins7d = recentLogins.filter((e) => e.at >= cutoff7d).length;
  const loginSeries = dailySeries(recentLogins.map((e) => String(e.at)), dayKeys);
  const failedLogins7d = await eventsCol.countDocuments({ type: "login_failed", at: { $gte: cutoff7d } });

  // Active users (from lastSeenAt) ----------------------------------------
  const [dau, wau] = await Promise.all([
    usersCol.countDocuments({ lastSeenAt: { $gte: cutoff24h } }),
    usersCol.countDocuments({ lastSeenAt: { $gte: cutoff7d } }),
  ]);

  // Referrals --------------------------------------------------------------
  const referralAgg = await couplesCol
    .aggregate<{ _id: null; total: number }>([
      { $group: { _id: null, total: { $sum: { $ifNull: ["$referralCount", 0] } } } },
    ])
    .toArray();
  const referralsGiven = referralAgg[0]?.total ?? 0;
  const referredSignups = await couplesCol.countDocuments({ referredBy: { $exists: true } });

  // Content counts (per collection) ---------------------------------------
  const contentCounts = await Promise.all(
    CONTENT_COLLECTIONS.map(async (c) => ({
      name: c.name,
      label: c.label,
      count: await (await getCol(c.name)).countDocuments(),
    })),
  );
  const totalContent = contentCounts.reduce((sum, c) => sum + c.count, 0);

  return NextResponse.json({
    ok: true,
    accounts: {
      totalCouples,
      pairedCouples,
      soloCouples: totalCouples - pairedCouples,
      totalUsers,
      verifiedUsers,
      unverifiedUsers,
    },
    signups: { last7d: signups7d, last30d: signups30d },
    logins: { last24h: logins24h, last7d: logins7d, failed7d: failedLogins7d },
    active: { dau, wau },
    referrals: { given: referralsGiven, referredSignups },
    content: { total: totalContent, byCollection: contentCounts },
    series: { dayKeys, signups: signupSeries, logins: loginSeries },
  });
});
