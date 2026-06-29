import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCol } from "@/lib/mongo";
import { withAuth } from "@/lib/apiHandler";

/**
 * One-time migration of pre-encryption (plaintext) content to E2EE.
 *
 * The server can't encrypt (it has no key), so this is a client-driven, in-place
 * upgrade with no structural changes:
 *   GET  → returns the couple's own raw stored values for the encryptable fields
 *          (their own data, authenticated). The client encrypts any that aren't
 *          already encrypted.
 *   POST → applies targeted $set of those ciphertext values by document id
 *          (and, for the daily question, by date + answers.<uid>.text).
 *
 * No inserts, no deletes, no other fields touched. Idempotent: the client only
 * sends values that were still plaintext, so re-running is a no-op.
 */

// collection → fields holding user text. dailyAnswers is handled separately
// because its text lives in a per-user nested map (answers.<uid>.text).
const FLAT: Record<string, string[]> = {
  calendar: ["note", "specialLabel", "mood", "pinnedNote"],
  loveJar: ["text"],
  voicenotes: ["label"],
  bucketlist: ["text"],
  watchlist: ["title", "notes"],
  capsules: ["letter"],
};

export const GET = withAuth(async (_req, session) => {
  const coupleId = session.coupleId;
  const out: Record<string, unknown> = {};

  for (const [name, fields] of Object.entries(FLAT)) {
    const col = await getCol(name);
    const projection: Record<string, 1> = { _id: 1 };
    for (const f of fields) projection[f] = 1;
    const docs = await col.find({ coupleId }, { projection }).toArray();
    out[name] = docs.map((d) => {
      const item: Record<string, unknown> = { id: d._id.toString() };
      for (const f of fields) if (typeof d[f] === "string") item[f] = d[f];
      return item;
    });
  }

  // Daily: return each doc's answers as { date, answers: { uid: text } }.
  const daily = await getCol("dailyAnswers");
  const dailyDocs = await daily.find({ coupleId }, { projection: { date: 1, answers: 1 } }).toArray();
  out.daily = dailyDocs.map((d) => {
    const answers: Record<string, string> = {};
    const src = (d.answers ?? {}) as Record<string, { text?: unknown }>;
    for (const [uid, a] of Object.entries(src)) if (typeof a?.text === "string") answers[uid] = a.text;
    return { date: d.date, answers };
  });

  return NextResponse.json({ ok: true, data: out });
});

interface FlatOp { collection: string; id: string; set: Record<string, string> }
interface DailyOp { date: string; answers: Record<string, string> }

export const POST = withAuth(async (req, session) => {
  const coupleId = session.coupleId;
  const body = (await req.json().catch(() => ({}))) as { ops?: FlatOp[]; daily?: DailyOp[] };
  const ops = Array.isArray(body.ops) ? body.ops.slice(0, 10_000) : [];
  const dailyOps = Array.isArray(body.daily) ? body.daily.slice(0, 10_000) : [];

  let updated = 0;

  for (const op of ops) {
    const allowed = FLAT[op.collection];
    if (!allowed || !op.id || !ObjectId.isValid(op.id) || !op.set || typeof op.set !== "object") continue;
    const set: Record<string, string> = {};
    for (const [k, val] of Object.entries(op.set)) {
      if (allowed.includes(k) && typeof val === "string") set[k] = val;
    }
    if (!Object.keys(set).length) continue;
    const col = await getCol(op.collection);
    const r = await col.updateOne({ _id: new ObjectId(op.id), coupleId }, { $set: set });
    updated += r.modifiedCount;
  }

  if (dailyOps.length) {
    const daily = await getCol("dailyAnswers");
    for (const op of dailyOps) {
      if (!op.date || !op.answers || typeof op.answers !== "object") continue;
      const set: Record<string, string> = {};
      for (const [uid, ct] of Object.entries(op.answers)) {
        // uid is a Mongo ObjectId string of a user; only set the .text leaf.
        if (typeof uid === "string" && /^[a-f0-9]{24}$/i.test(uid) && typeof ct === "string") {
          set[`answers.${uid}.text`] = ct;
        }
      }
      if (!Object.keys(set).length) continue;
      const r = await daily.updateOne({ coupleId, date: op.date }, { $set: set });
      updated += r.modifiedCount;
    }
  }

  return NextResponse.json({ ok: true, updated });
});
