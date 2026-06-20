import { NextResponse } from "next/server";
import { getCol } from "@/lib/mongo";
import { withAuth } from "@/lib/apiHandler";
import { broadcastCalendarUpdate } from "@/lib/sseBroadcast";
import { uploadToCloudinaryServer, isHostedUrl, resourceTypeFromDataUrl } from "@/lib/cloudinaryServer";
import { log } from "@/lib/log";

/**
 * One-shot bulk migration of legacy embedded photos.
 *
 * Entries created before the Cloudinary upload mechanism stored each photo as a
 * base64 `data:` URL embedded in the Mongo document. Those bloat the DB and now
 * exceed the calendar route's 2048-char-per-photo limit, so saving such an
 * entry fails entirely. This walks every calendar entry for the caller's
 * couple, re-uploads each non-hosted photo to Cloudinary, and rewrites the
 * `photos` array with the resulting CDN URLs.
 *
 * Properties:
 *   • Idempotent — only touches photos that aren't already hosted URLs, so it's
 *     safe to run repeatedly.
 *   • Incremental — each entry is updated as soon as it's processed, so partial
 *     progress survives a serverless timeout; re-running resumes the rest.
 *   • Scoped — only the authenticated couple's own entries are migrated.
 *   • Best-effort — a photo that can't be re-uploaded is left untouched and
 *     reported in `failures` rather than aborting the whole run.
 */
export const POST = withAuth(async (_req, session) => {
  const col = await getCol("calendar");
  const entries = await col.find({ coupleId: session.coupleId }).toArray();

  let entriesScanned = 0;
  let entriesUpdated = 0;
  let photosMigrated = 0;
  const failures: { date: string; error: string }[] = [];

  for (const entry of entries) {
    entriesScanned++;
    const photos: string[] = Array.isArray(entry.photos) ? entry.photos : [];
    if (!photos.some(p => typeof p === "string" && !isHostedUrl(p))) continue;

    const next: string[] = [];
    let changed = false;
    for (const p of photos) {
      if (typeof p !== "string" || isHostedUrl(p)) { next.push(p); continue; }
      try {
        const url = await uploadToCloudinaryServer(p, {
          folder: `journal/${session.coupleId}/migrated`,
          resourceType: resourceTypeFromDataUrl(p),
        });
        next.push(url);
        photosMigrated++;
        changed = true;
      } catch (err) {
        next.push(p); // keep original; reported below, retry on a later run
        failures.push({ date: entry.date, error: (err as Error).message });
      }
    }

    if (changed) {
      await col.updateOne({ _id: entry._id }, { $set: { photos: next } });
      entriesUpdated++;
      // Push the freshly-rewritten entry to any connected clients.
      const { _id, ...rest } = entry;
      void _id;
      broadcastCalendarUpdate(session.coupleId, { type: "update", entry: { ...rest, photos: next } });
    }
  }

  log.info({
    msg: "admin:migrate-photos done",
    coupleId: session.coupleId,
    entriesScanned, entriesUpdated, photosMigrated, failures: failures.length,
  });

  return NextResponse.json({ ok: true, entriesScanned, entriesUpdated, photosMigrated, failures });
}, { rateLimit: { scope: "admin:migrate", max: 5, windowMs: 60_000 } });
