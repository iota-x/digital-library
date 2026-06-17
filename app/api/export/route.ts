import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCol } from "@/lib/mongo";
import { withAuth } from "@/lib/apiHandler";

/**
 * "Download all our data" — a single JSON archive of everything a couple has
 * created, so their irreplaceable memories aren't trapped on one Atlas
 * cluster. Best-effort full export; media files stay on Cloudinary but every
 * URL is listed in `media` so they can be fetched/archived separately.
 *
 * Deliberately excluded: otps, pushSubscriptions (ephemeral / device secrets).
 * Secret-looking fields (password hashes, tokens) are stripped before output.
 */

// Collections that are keyed by coupleId and safe to export wholesale.
const COUPLE_COLLECTIONS = [
  "calendar", "bucketlist", "watchlist", "voicenotes",
  "capsules", "dailyAnswers", "doodles", "watchSessions",
] as const;

const SECRET_KEY = /password|passwordhash|hash|token|secret|otp/i;

/** Recursively drop secret-looking keys from a document. */
function sanitize<T>(value: T): T {
  if (Array.isArray(value)) return value.map(sanitize) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEY.test(k)) continue;
      out[k] = sanitize(v);
    }
    return out as T;
  }
  return value;
}

/** Collect every http(s) media URL referenced across the exported data. */
function collectMedia(data: Record<string, unknown[]>): string[] {
  const urls = new Set<string>();
  const add = (v: unknown) => {
    if (typeof v === "string" && /^https?:\/\//.test(v)) urls.add(v);
  };
  for (const e of data.calendar ?? []) {
    const entry = e as { photos?: unknown[]; photoStickers?: Record<string, unknown> };
    (entry.photos ?? []).forEach(add);
    Object.keys(entry.photoStickers ?? {}).forEach(add);
  }
  for (const v of data.voicenotes ?? []) add((v as { url?: unknown }).url);
  for (const w of data.watchlist ?? []) add((w as { coverImage?: unknown }).coverImage);
  return [...urls];
}

export const GET = withAuth(async (_req, session) => {
  const { coupleId } = session;

  const collected: Record<string, unknown[]> = {};
  await Promise.all(
    COUPLE_COLLECTIONS.map(async (name) => {
      const col = await getCol(name);
      const docs = await col.find({ coupleId }).toArray();
      collected[name] = docs.map(sanitize);
    }),
  );

  // Couple profile + members (secrets stripped). coupleId is the couples
  // document's _id (an ObjectId) serialized to a string in the session.
  const couplesCol = await getCol("couples");
  const couple = ObjectId.isValid(coupleId)
    ? await couplesCol.findOne({ _id: new ObjectId(coupleId) })
    : null;
  const usersCol = await getCol("users");
  const users = await usersCol.find({ coupleId }).toArray();

  const archive = {
    exportedAt: new Date().toISOString(),
    coupleId,
    version: 1,
    couple: couple ? sanitize(couple) : null,
    members: users.map(sanitize),
    ...collected,
    media: collectMedia(collected),
  };

  const filename = `us-export-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(archive, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
});
