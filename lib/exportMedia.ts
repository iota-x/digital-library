"use client";
import { buildZip, type ZipEntry } from "@/lib/zip";

/**
 * The true "irreplaceable data" safety net: a real zip of the actual photos
 * and voice notes (not just a URL manifest).
 *
 * Runs in the browser — it pulls the JSON archive from /api/export, then
 * fetches each referenced media file and packs them into a single .zip. Doing
 * this client-side sidesteps serverless memory/time limits, and the JSON
 * manifest (which lists every URL) is always included, so even a media file
 * that fails to download is never truly lost.
 */

const AUDIO_EXT = /\.(mp3|m4a|aac|wav|ogg|oga|webm|weba)(\?|$)/i;

function extFromUrl(url: string): string {
  const clean = url.split("?")[0];
  const m = clean.match(/\.([a-z0-9]{2,5})$/i);
  return m ? m[1].toLowerCase() : "bin";
}

function entryName(url: string, index: number): string {
  const ext = extFromUrl(url);
  const folder = AUDIO_EXT.test(url) ? "voice-notes" : "photos";
  const n = String(index + 1).padStart(3, "0");
  return `${folder}/${n}.${ext}`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export interface ExportProgress { done: number; total: number; failed: number }

export async function exportMediaZip(onProgress?: (p: ExportProgress) => void): Promise<void> {
  const res = await fetch("/api/export", { cache: "no-store" });
  if (!res.ok) throw new Error(`export failed (${res.status})`);
  const archive = await res.json();
  const media: string[] = Array.isArray(archive.media) ? archive.media : [];

  const entries: ZipEntry[] = [
    { name: "data.json", data: new TextEncoder().encode(JSON.stringify(archive, null, 2)) },
  ];

  let done = 0;
  let failed = 0;
  // Sequential fetch keeps memory + connection use sane on mobile.
  for (let i = 0; i < media.length; i++) {
    try {
      const r = await fetch(media[i]);
      if (!r.ok) throw new Error(String(r.status));
      entries.push({ name: entryName(media[i], i), data: new Uint8Array(await r.arrayBuffer()) });
    } catch {
      failed++; // URL still preserved in data.json
    }
    done++;
    onProgress?.({ done, total: media.length, failed });
  }

  const blob = buildZip(entries);
  triggerDownload(blob, `us-media-${new Date().toISOString().slice(0, 10)}.zip`);
}
