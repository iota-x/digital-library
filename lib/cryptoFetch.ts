"use client";
/**
 * Transparent E2EE at the network boundary.
 *
 * The couple's text content fans out across many read sites (stores, MoodGraph,
 * ExportPDF, CommandPalette, the daily archive, …) and write sites. Rather than
 * sprinkle encrypt/decrypt across all of them, we wrap `fetch` once and transform
 * only the known content endpoints: request bodies are encrypted on the way out,
 * responses decrypted on the way in. Everything else passes through untouched.
 *
 * Fields not listed here (dates, ids, flags, URLs, ratings, reactions) stay
 * plaintext. Legacy plaintext is handled automatically: encryptField skips data
 * that's already encrypted, and decryptField passes through anything that isn't
 * one of our envelopes — so pre-encryption data keeps working and re-encrypts
 * the next time it's written.
 */
import { encryptField, decryptField, hasKeys } from "@/lib/crypto";

type Obj = Record<string, unknown>;

async function encFields(o: unknown, fields: string[]): Promise<unknown> {
  if (!o || typeof o !== "object") return o;
  const out: Obj = { ...(o as Obj) };
  for (const f of fields) if (typeof out[f] === "string") out[f] = await encryptField(out[f] as string);
  return out;
}
async function decFields(o: unknown, fields: string[]): Promise<unknown> {
  if (!o || typeof o !== "object") return o;
  const out: Obj = { ...(o as Obj) };
  for (const f of fields) if (typeof out[f] === "string") out[f] = await decryptField(out[f] as string);
  return out;
}
const decAny = (d: unknown, fields: string[]) =>
  Array.isArray(d) ? Promise.all(d.map((x) => decFields(x, fields))) : decFields(d, fields);

// Daily question has a nested shape: { mine, partner: { text } }.
async function decDaily(d: unknown): Promise<unknown> {
  if (!d || typeof d !== "object") return d;
  const out: Obj = { ...(d as Obj) };
  if (typeof out.mine === "string") out.mine = await decryptField(out.mine);
  const p = out.partner as Obj | null;
  if (p && typeof p === "object" && typeof p.text === "string") {
    out.partner = { ...p, text: await decryptField(p.text as string) };
  }
  return out;
}
async function decDailyHistory(d: unknown): Promise<unknown> {
  if (!Array.isArray(d)) return d;
  return Promise.all(d.map(async (day) => {
    const answers = (day as Obj)?.answers;
    if (Array.isArray(answers)) {
      return { ...(day as Obj), answers: await Promise.all(answers.map((a) => decFields(a, ["text"]))) };
    }
    return day;
  }));
}

const CAL = ["note", "specialLabel", "mood", "pinnedNote"];
const WATCH = ["title", "notes"];

interface Transform {
  encReq?: (body: unknown) => Promise<unknown>;
  decRes?: (data: unknown) => Promise<unknown>;
}

// Keyed by exact pathname (query string stripped). Order doesn't matter — exact.
const TRANSFORMS: Record<string, Transform> = {
  "/api/calendar":      { encReq: (b) => encFields(b, CAL),       decRes: (d) => decAny(d, CAL) },
  "/api/daily":         { encReq: (b) => encFields(b, ["answer"]), decRes: decDaily },
  "/api/daily/history": { decRes: decDailyHistory },
  "/api/lovejar":       { encReq: (b) => encFields(b, ["text"]),  decRes: (d) => decAny(d, ["text"]) },
  "/api/voicenotes":    { encReq: (b) => encFields(b, ["label"]), decRes: (d) => decAny(d, ["label"]) },
  "/api/bucketlist":    { encReq: (b) => encFields(b, ["text"]),  decRes: (d) => decAny(d, ["text"]) },
  "/api/watchlist":     { encReq: (b) => encFields(b, WATCH),     decRes: (d) => decAny(d, WATCH) },
  "/api/timecapsule":   { encReq: (b) => encFields(b, ["letter"]), decRes: (d) => decAny(d, ["letter"]) },
};

function pathOf(url: string): string {
  try { return new URL(url, typeof location !== "undefined" ? location.origin : "http://x").pathname; }
  catch { return url.split("?")[0]; }
}

declare global {
  // eslint-disable-next-line no-var
  var __cryptoFetchInstalled: boolean | undefined;
}

/** Install the fetch interceptor once. Safe to call repeatedly. */
export function installCryptoFetch(): void {
  if (typeof window === "undefined" || globalThis.__cryptoFetchInstalled) return;
  globalThis.__cryptoFetchInstalled = true;

  const orig = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const t = TRANSFORMS[pathOf(url)];
    if (!t) return orig(input, init);
    // Only act once keys are loaded; otherwise behave exactly as before.
    if (!(await hasKeys())) return orig(input, init);

    // Encrypt an outgoing JSON string body in place.
    let nextInit = init;
    if (t.encReq && init?.body && typeof init.body === "string") {
      try {
        const enc = await t.encReq(JSON.parse(init.body));
        nextInit = { ...init, body: JSON.stringify(enc) };
      } catch { /* not JSON — leave as-is */ }
    }

    const res = await orig(input, nextInit);
    if (!t.decRes || !res.ok) return res;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return res;

    try {
      const data = await res.clone().json();
      const dec = await t.decRes(data);
      return new Response(JSON.stringify(dec), {
        status: res.status, statusText: res.statusText, headers: res.headers,
      });
    } catch {
      return res; // parsing/transform failed — hand back the original
    }
  };
}
