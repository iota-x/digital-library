import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { withAdmin, CONTENT_COLLECTIONS } from "@/lib/admin";
import { getCol } from "@/lib/mongo";

const AUTH_TYPES = new Set(["login", "login_failed", "verify_email"]);

interface FeedItem {
  kind: "auth" | "content";
  type: string;       // event type, or content collection name
  label: string;      // human label
  coupleId: string | null;
  coupleName?: string | null;
  email?: string | null;
  ip?: string | null;
  at: string;
}

/** Merged activity feed: logged auth events + derived content writes.
 *  Filters: ?type=login|login_failed|verify_email|content, ?coupleId=, ?limit= */
export const GET = withAdmin(async (req) => {
  const url = new URL(req.url);
  const typeParam = url.searchParams.get("type")?.trim() ?? "";
  const coupleId = url.searchParams.get("coupleId")?.trim() ?? "";
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") ?? "60", 10) || 60));

  const wantAuth = !typeParam || AUTH_TYPES.has(typeParam);
  const wantContent = !typeParam || typeParam === "content";

  const items: FeedItem[] = [];

  // Auth events ------------------------------------------------------------
  if (wantAuth) {
    const eventsCol = await getCol("events");
    const filter: Record<string, unknown> = {};
    if (AUTH_TYPES.has(typeParam)) filter.type = typeParam;
    if (coupleId) filter.coupleId = coupleId;
    const evs = await eventsCol.find(filter).sort({ at: -1 }).limit(limit).toArray();
    for (const e of evs) {
      items.push({
        kind: "auth",
        type: String(e.type),
        label: String(e.type).replace("_", " "),
        coupleId: e.coupleId ?? null,
        email: e.email ?? null,
        ip: e.ip ?? null,
        at: String(e.at),
      });
    }
  }

  // Derived content writes -------------------------------------------------
  if (wantContent) {
    const perCollection = await Promise.all(
      CONTENT_COLLECTIONS.map(async (cc) => {
        const col = await getCol(cc.name);
        const filter = coupleId ? { coupleId } : {};
        const docs = await col
          .find(filter, { projection: { coupleId: 1, [cc.tsField]: 1 } })
          .sort({ [cc.tsField]: -1 })
          .limit(limit)
          .toArray();
        return docs.map<FeedItem>((d) => ({
          kind: "content",
          type: cc.name,
          label: cc.label,
          coupleId: d.coupleId ?? null,
          at: String(d[cc.tsField] ?? ""),
        }));
      }),
    );
    for (const list of perCollection) items.push(...list);
  }

  // Merge, sort newest-first, trim.
  items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  const trimmed = items.slice(0, limit);

  // Attach couple display names for the rows we're returning.
  const ids = [...new Set(trimmed.map((i) => i.coupleId).filter(Boolean))] as string[];
  const oids = ids
    .map((id) => { try { return new ObjectId(id); } catch { return null; } })
    .filter((x): x is ObjectId => x !== null);
  const nameById = new Map<string, string>();
  if (oids.length) {
    const couplesCol = await getCol("couples");
    const couples = await couplesCol
      .find({ _id: { $in: oids } }, { projection: { person1Name: 1, person2Name: 1 } })
      .toArray();
    for (const c of couples) {
      const label = [c.person1Name, c.person2Name].filter(Boolean).join(" & ") || c._id.toString();
      nameById.set(c._id.toString(), label);
    }
  }
  for (const it of trimmed) {
    it.coupleName = it.coupleId ? nameById.get(it.coupleId) ?? null : null;
  }

  return NextResponse.json({ ok: true, items: trimmed });
});
