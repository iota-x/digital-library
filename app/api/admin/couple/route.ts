import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { withAdmin, CONTENT_COLLECTIONS } from "@/lib/admin";
import { getCol } from "@/lib/mongo";

const MAX_PER_COLLECTION = 500;

/** Full detail for one couple — members + all content + recent events.
 *  Couple id is passed as ?id= (avoids the dynamic-segment params convention,
 *  which has no precedent in this customized Next build). */
export const GET = withAdmin(async (req) => {
  const id = new URL(req.url).searchParams.get("id")?.trim() ?? "";
  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const couplesCol = await getCol("couples");
  const couple = await couplesCol.findOne({ _id: oid });
  if (!couple) return NextResponse.json({ error: "not found" }, { status: 404 });

  const usersCol = await getCol("users");
  const members = await usersCol
    .find({ coupleId: id }, { projection: { passwordHash: 0 } })
    .toArray();

  // Pull each content collection for this couple, newest first by its ts field.
  const sections = await Promise.all(
    CONTENT_COLLECTIONS.map(async (cc) => {
      const col = await getCol(cc.name);
      const items = await col
        .find({ coupleId: id })
        .sort({ [cc.tsField]: -1 })
        .limit(MAX_PER_COLLECTION)
        .toArray();
      return {
        name: cc.name,
        label: cc.label,
        tsField: cc.tsField,
        count: items.length,
        items: items.map((it) => ({ ...it, _id: it._id.toString() })),
      };
    }),
  );

  const eventsCol = await getCol("events");
  const events = await eventsCol
    .find({ coupleId: id })
    .sort({ at: -1 })
    .limit(100)
    .toArray();

  return NextResponse.json({
    ok: true,
    couple: {
      id,
      person1Name: couple.person1Name ?? null,
      person1Email: couple.person1Email ?? null,
      person2Name: couple.person2Name ?? null,
      person2Email: couple.person2Email ?? null,
      inviteCode: couple.inviteCode ?? null,
      referralCode: couple.referralCode ?? null,
      referralCount: couple.referralCount ?? 0,
      referredBy: couple.referredBy ?? null,
      startDate: couple.startDate ?? null,
      createdAt: couple.createdAt ?? null,
    },
    members: members.map((m) => ({
      id: m._id.toString(),
      name: m.name,
      email: m.email,
      role: m.role,
      emailVerified: m.emailVerified !== false,
      createdAt: m.createdAt ?? null,
      lastSeenAt: m.lastSeenAt ?? null,
    })),
    sections,
    events: events.map((e) => ({ ...e, _id: e._id.toString() })),
  });
});
