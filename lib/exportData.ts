"use client";
/**
 * Client-side decrypting data export.
 *
 * /api/export returns the couple's full archive, but text content is end-to-end
 * encrypted so the server can only emit ciphertext. This fetches that archive,
 * decrypts the known content fields on-device (where the key lives), and saves a
 * readable JSON file — so "download all our data" actually gives back plaintext.
 *
 * It's a real `fetch` (not an <a download>), so it goes through the crypto fetch
 * interceptor — but /api/export isn't one of the intercepted endpoints, so the
 * ciphertext arrives untouched and we decrypt it here explicitly.
 */
import { decryptField } from "@/lib/crypto";

const FIELDS: Record<string, string[]> = {
  calendar: ["note", "specialLabel", "mood", "pinnedNote"],
  loveJar: ["text"],
  voicenotes: ["label"],
  bucketlist: ["text"],
  watchlist: ["title", "notes"],
  capsules: ["letter"],
};

async function decFields(obj: Record<string, unknown>, fields: string[]): Promise<void> {
  for (const f of fields) {
    if (typeof obj[f] === "string") obj[f] = await decryptField(obj[f] as string);
  }
}

export async function exportDecryptedJson(): Promise<void> {
  const res = await fetch("/api/export", { cache: "no-store" });
  if (!res.ok) throw new Error("Couldn't fetch your data. Try again.");
  const data = await res.json();

  // Flat collections.
  for (const [coll, fields] of Object.entries(FIELDS)) {
    const arr = data?.[coll];
    if (Array.isArray(arr)) for (const item of arr) if (item && typeof item === "object") await decFields(item, fields);
  }

  // Daily answers: nested { answers: { <uid>: { text } } }.
  if (Array.isArray(data?.dailyAnswers)) {
    for (const doc of data.dailyAnswers) {
      const answers = (doc as { answers?: Record<string, { text?: unknown }> })?.answers;
      if (answers && typeof answers === "object") {
        for (const a of Object.values(answers)) {
          if (a && typeof a.text === "string") a.text = await decryptField(a.text);
        }
      }
    }
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `us-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
