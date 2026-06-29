"use client";
/**
 * One-time client-driven migration of pre-encryption plaintext to E2EE.
 *
 * Reads the couple's raw stored values from /api/migrate-e2ee (which is NOT
 * routed through the fetch interceptor), encrypts any field that isn't already
 * an envelope, and posts the ciphertext back for an in-place $set. Runs once per
 * couple per device (localStorage flag); only when the keys are loaded.
 */
import { encryptField, isEnvelope, hasKeys } from "@/lib/crypto";

const FLAT_FIELDS: Record<string, string[]> = {
  calendar: ["note", "specialLabel", "mood", "pinnedNote"],
  loveJar: ["text"],
  voicenotes: ["label"],
  bucketlist: ["text"],
  watchlist: ["title", "notes"],
  capsules: ["letter"],
};

interface FlatOp { collection: string; id: string; set: Record<string, string> }
interface DailyOp { date: string; answers: Record<string, string> }

const flagKey = (coupleId: string) => `ann_e2ee_migrated_${coupleId}`;

/** Encrypt one field value unless it's empty or already encrypted. */
async function enc(value: unknown): Promise<string | null> {
  if (typeof value !== "string" || value === "" || isEnvelope(value)) return null;
  const out = await encryptField(value);
  return typeof out === "string" ? out : null;
}

export async function runMigrationIfNeeded(coupleId: string): Promise<void> {
  if (typeof window === "undefined" || !coupleId) return;
  try { if (localStorage.getItem(flagKey(coupleId))) return; } catch { return; }
  if (!(await hasKeys())) return; // can't encrypt yet — try again next load

  try {
    const res = await fetch("/api/migrate-e2ee", { cache: "no-store" });
    if (!res.ok) return;
    const { data } = (await res.json()) as { data: Record<string, unknown> };
    if (!data) return;

    const ops: FlatOp[] = [];
    for (const [collection, fields] of Object.entries(FLAT_FIELDS)) {
      const items = data[collection];
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        const id = (item as { id?: string })?.id;
        if (!id) continue;
        const set: Record<string, string> = {};
        for (const f of fields) {
          const ct = await enc((item as Record<string, unknown>)[f]);
          if (ct) set[f] = ct;
        }
        if (Object.keys(set).length) ops.push({ collection, id, set });
      }
    }

    const daily: DailyOp[] = [];
    if (Array.isArray(data.daily)) {
      for (const d of data.daily as { date: string; answers: Record<string, string> }[]) {
        if (!d?.date || !d.answers) continue;
        const answers: Record<string, string> = {};
        for (const [uid, text] of Object.entries(d.answers)) {
          const ct = await enc(text);
          if (ct) answers[uid] = ct;
        }
        if (Object.keys(answers).length) daily.push({ date: d.date, answers });
      }
    }

    if (ops.length || daily.length) {
      await fetch("/api/migrate-e2ee", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ops, daily }),
      });
    }
    // Mark done even when there was nothing to migrate, so we don't re-scan.
    try { localStorage.setItem(flagKey(coupleId), new Date().toISOString()); } catch {}
  } catch {
    // Transient failure — leave the flag unset so it retries on the next load.
  }
}
