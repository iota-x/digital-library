import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { withAdmin, CONTENT_COLLECTIONS } from "@/lib/admin";
import { getCol } from "@/lib/mongo";

const PAGE_SIZE = 25;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const GET = withAdmin(async (req) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);

  const couplesCol = await getCol("couples");
  const usersCol = await getCol("users");
  const eventsCol = await getCol("events");

  // Build the couple filter. A search term matches couple-level fields OR any
  // member account's name/email (resolved to their coupleIds first).
  let filter: Record<string, unknown> = {};
  if (q) {
    const re = new RegExp(escapeRegex(q), "i");
    const memberCoupleIds = (
      await usersCol
        .find({ $or: [{ email: re }, { name: re }] }, { projection: { coupleId: 1 } })
        .toArray()
    )
      .map((u) => u.coupleId)
      .filter(Boolean) as string[];
    const memberOids = memberCoupleIds
      .map((id) => { try { return new ObjectId(id); } catch { return null; } })
      .filter((x): x is ObjectId => x !== null);
    filter = {
      $or: [
        { person1Name: re }, { person1Email: re },
        { person2Name: re }, { person2Email: re },
        { inviteCode: re }, { referralCode: re },
        ...(memberOids.length ? [{ _id: { $in: memberOids } }] : []),
      ],
    };
  }

  const total = await couplesCol.countDocuments(filter);
  const couples = await couplesCol
    .find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .toArray();

  const coupleIds = couples.map((c) => c._id.toString());

  // Members for this page, grouped by coupleId.
  const members = await usersCol
    .find(
      { coupleId: { $in: coupleIds } },
      { projection: { passwordHash: 0 } },
    )
    .toArray();
  const membersByCouple = new Map<string, typeof members>();
  for (const m of members) {
    const list = membersByCouple.get(m.coupleId) ?? [];
    list.push(m);
    membersByCouple.set(m.coupleId, list);
  }

  // Last login per couple (max `at` among type:login events for this page).
  const loginAgg = await eventsCol
    .aggregate<{ _id: string; lastLogin: string }>([
      { $match: { type: "login", coupleId: { $in: coupleIds } } },
      { $group: { _id: "$coupleId", lastLogin: { $max: "$at" } } },
    ])
    .toArray();
  const lastLoginByCouple = new Map(loginAgg.map((g) => [g._id, g.lastLogin]));

  // Content counts per couple, one aggregation per collection (page-scoped).
  const countsByCouple = new Map<string, Record<string, number>>();
  await Promise.all(
    CONTENT_COLLECTIONS.map(async (cc) => {
      const col = await getCol(cc.name);
      const agg = await col
        .aggregate<{ _id: string; n: number }>([
          { $match: { coupleId: { $in: coupleIds } } },
          { $group: { _id: "$coupleId", n: { $sum: 1 } } },
        ])
        .toArray();
      for (const g of agg) {
        const rec = countsByCouple.get(g._id) ?? {};
        rec[cc.name] = g.n;
        countsByCouple.set(g._id, rec);
      }
    }),
  );

  const rows = couples.map((c) => {
    const id = c._id.toString();
    const counts = countsByCouple.get(id) ?? {};
    return {
      id,
      person1Name: c.person1Name ?? null,
      person2Name: c.person2Name ?? null,
      inviteCode: c.inviteCode ?? null,
      referralCode: c.referralCode ?? null,
      referralCount: c.referralCount ?? 0,
      referredBy: c.referredBy ?? null,
      startDate: c.startDate ?? null,
      createdAt: c.createdAt ?? null,
      lastLogin: lastLoginByCouple.get(id) ?? null,
      members: (membersByCouple.get(id) ?? []).map((m) => ({
        id: m._id.toString(),
        name: m.name,
        email: m.email,
        role: m.role,
        emailVerified: m.emailVerified !== false,
        createdAt: m.createdAt ?? null,
        lastSeenAt: m.lastSeenAt ?? null,
      })),
      contentTotal: Object.values(counts).reduce((a, b) => a + b, 0),
      contentCounts: counts,
    };
  });

  return NextResponse.json({
    ok: true,
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    couples: rows,
  });
});
