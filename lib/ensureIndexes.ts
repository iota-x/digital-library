import type { Db, IndexSpecification, CreateIndexesOptions } from "mongodb";
import { log } from "@/lib/log";

/**
 * Idempotent index creation for the app's collections.
 *
 * Every query in the app filters by {coupleId} (and often a date / sort key).
 * Without indexes those are full collection scans — fine for two people on day
 * one, but calendar/doodle histories grow over years. This adds the obvious
 * compound indexes plus a TTL index on otps so expired one-time codes are
 * reaped by Mongo instead of accumulating forever (they were only ever checked
 * at read time, never deleted).
 *
 * Runs at most once per process: kicked off (not awaited) the first time a DB
 * handle is requested, so it never adds latency to a request. createIndex is a
 * no-op when the index already exists, and each spec is settled independently
 * so one failure (e.g. a legacy duplicate blocking a unique index) can't stop
 * the others.
 */

declare global {
  // eslint-disable-next-line no-var
  var _indexesEnsured: Promise<void> | undefined;
}

interface IndexDef {
  collection: string;
  keys: IndexSpecification;
  options?: CreateIndexesOptions;
}

const INDEXES: IndexDef[] = [
  // Calendar — list by couple, and the per-day upsert lookup.
  { collection: "calendar", keys: { coupleId: 1, date: 1 } },
  // Resource lists — couple scope + their natural sort key.
  { collection: "bucketlist", keys: { coupleId: 1, addedAt: 1 } },
  { collection: "watchlist", keys: { coupleId: 1, addedAt: -1 } },
  { collection: "voicenotes", keys: { coupleId: 1, createdAt: -1 } },
  { collection: "capsules", keys: { coupleId: 1, unlockDate: 1 } },
  { collection: "doodles", keys: { coupleId: 1 } },
  { collection: "doodleGallery", keys: { coupleId: 1, createdAt: -1 } },
  { collection: "dailyAnswers", keys: { coupleId: 1, date: 1 } },
  { collection: "loveJar", keys: { coupleId: 1, addedAt: -1 } },
  { collection: "watchSessions", keys: { coupleId: 1 } },
  { collection: "pushSubscriptions", keys: { coupleId: 1 } },
  // Auth — lookups by email / invite code / couple membership.
  { collection: "users", keys: { email: 1 }, options: { unique: true } },
  { collection: "users", keys: { coupleId: 1 } },
  { collection: "users", keys: { lastSeenAt: -1 } },
  { collection: "couples", keys: { inviteCode: 1 } },
  // Admin event log — global feed, per-type feed, and per-couple history.
  { collection: "events", keys: { at: -1 } },
  { collection: "events", keys: { type: 1, at: -1 } },
  { collection: "events", keys: { coupleId: 1, at: -1 } },
  // OTPs — single pending code per (email, purpose) + TTL reaping on expiry.
  { collection: "otps", keys: { email: 1, purpose: 1 } },
  { collection: "otps", keys: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
];

export function ensureIndexes(db: Db): Promise<void> {
  if (global._indexesEnsured) return global._indexesEnsured;
  global._indexesEnsured = (async () => {
    const results = await Promise.allSettled(
      INDEXES.map((def) => db.collection(def.collection).createIndex(def.keys, def.options ?? {})),
    );
    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length) {
      log.warn({
        msg: "some indexes could not be created",
        count: failed.length,
        errors: failed.map((f) => (f as PromiseRejectedResult).reason?.message ?? "unknown"),
      });
    }
  })();
  return global._indexesEnsured;
}
