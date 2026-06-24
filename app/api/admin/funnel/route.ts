import { NextResponse } from "next/server";
import { withAdmin, CONTENT_COLLECTIONS } from "@/lib/admin";
import { getCol } from "@/lib/mongo";

const AT_RISK_DAYS = 14;

export const GET = withAdmin(async () => {
  const couplesCol = await getCol("couples");
  const usersCol = await getCol("users");

  const totalCouples = await couplesCol.countDocuments();

  // Members per couple → paired count + max last-seen per couple.
  const memberAgg = await usersCol
    .aggregate<{ _id: string; n: number; verified: number; lastSeen: string | null }>([
      {
        $group: {
          _id: "$coupleId",
          n: { $sum: 1 },
          verified: { $sum: { $cond: [{ $ne: ["$emailVerified", false] }, 1, 0] } },
          lastSeen: { $max: "$lastSeenAt" },
        },
      },
    ])
    .toArray();
  const pairedCouples = memberAgg.filter((g) => g.n >= 2).length;
  const verifiedCouples = memberAgg.filter((g) => g.verified >= 1).length;
  const lastSeenByCouple = new Map(memberAgg.map((g) => [g._id, g.lastSeen]));

  // Content counts per couple (union of couples with any content).
  const contentCountByCouple = new Map<string, number>();
  await Promise.all(
    CONTENT_COLLECTIONS.map(async (cc) => {
      const col = await getCol(cc.name);
      const agg = await col
        .aggregate<{ _id: string; n: number }>([{ $group: { _id: "$coupleId", n: { $sum: 1 } } }])
        .toArray();
      for (const g of agg) {
        if (!g._id) continue;
        contentCountByCouple.set(g._id, (contentCountByCouple.get(g._id) ?? 0) + g.n);
      }
    }),
  );
  const couplesWithContent = contentCountByCouple.size;

  // Funnel stages, each a subset of the previous in spirit (we report raw counts
  // + conversion relative to signups).
  const pct = (n: number) => (totalCouples ? Math.round((n / totalCouples) * 1000) / 10 : 0);
  const funnel = [
    { stage: "Signed up", count: totalCouples, pct: 100 },
    { stage: "Verified email", count: verifiedCouples, pct: pct(verifiedCouples) },
    { stage: "Added content", count: couplesWithContent, pct: pct(couplesWithContent) },
    { stage: "Partner joined", count: pairedCouples, pct: pct(pairedCouples) },
  ];

  // At-risk: engaged couples (have content) who haven't been seen in N days.
  const cutoff = new Date(Date.now() - AT_RISK_DAYS * 86_400_000).toISOString();
  const engagedIds = [...contentCountByCouple.keys()];
  const atRiskIds = engagedIds.filter((id) => {
    const seen = lastSeenByCouple.get(id);
    return !seen || seen < cutoff;
  });

  // Hydrate names for the at-risk couples (cap the payload).
  const { ObjectId } = await import("mongodb");
  const atRiskOids = atRiskIds
    .map((id) => { try { return new ObjectId(id); } catch { return null; } })
    .filter((x): x is InstanceType<typeof ObjectId> => x !== null);
  const atRiskDocs = atRiskOids.length
    ? await couplesCol
        .find({ _id: { $in: atRiskOids } }, { projection: { person1Name: 1, person2Name: 1, createdAt: 1 } })
        .toArray()
    : [];
  const atRisk = atRiskDocs
    .map((c) => {
      const id = c._id.toString();
      return {
        id,
        name: [c.person1Name, c.person2Name].filter(Boolean).join(" & ") || "Unnamed",
        lastSeen: lastSeenByCouple.get(id) ?? null,
        contentTotal: contentCountByCouple.get(id) ?? 0,
        createdAt: c.createdAt ?? null,
      };
    })
    .sort((a, b) => (a.lastSeen ?? "") < (b.lastSeen ?? "") ? -1 : 1)
    .slice(0, 50);

  return NextResponse.json({
    ok: true,
    funnel,
    atRiskDays: AT_RISK_DAYS,
    atRiskCount: atRiskIds.length,
    atRisk,
  });
});
