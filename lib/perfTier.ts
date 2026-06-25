"use client";
/**
 * Adaptive, per-device performance tier. Picks how much visual fidelity the
 * device can afford and applies it as an <html> class, so weak phones don't melt
 * under the full effect stack while capable machines keep the heavy UI.
 *
 *   perf-high  full heavy UI (ambient petals, backdrop blurs, all motion)
 *   perf-mid   "plain": ambient decorations + GPU backdrop-blur dropped, motion kept
 *   perf-low   "lite":  also freezes animations/transitions
 *
 * Mode is 'auto' by default: an initial tier is guessed from static device hints
 * (cores / RAM / save-data / reduced-motion) before first paint — see the
 * bootstrap in app/layout.tsx — then a live FPS monitor (PerfMonitor) downgrades
 * it if the device actually janks and persists that, so the next visit starts
 * lower. A forced mode pins the tier and disables measuring.
 *
 * Mirrors the per-device pattern in lib/uiPrefs.ts (localStorage + <html> class
 * + an event MotionRoot listens to).
 */

export type PerfTier = "high" | "mid" | "low";
export type PerfMode = "auto" | PerfTier;

const MODE_KEY = "ann_perf_mode";   // 'auto' | 'high' | 'mid' | 'low'
const TIER_KEY = "ann_perf_tier";   // last resolved tier while in auto mode
export const PERF_EVENT = "annapp:perf";

const ORDER: PerfTier[] = ["high", "mid", "low"];
const isTier = (v: unknown): v is PerfTier => v === "high" || v === "mid" || v === "low";

/** Next tier down (clamped at "low"). */
export function lower(t: PerfTier): PerfTier {
  return ORDER[Math.min(ORDER.indexOf(t) + 1, ORDER.length - 1)];
}

function ls(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } }
function lsSet(k: string, v: string) { try { localStorage.setItem(k, v); } catch {} }

export function getPerfMode(): PerfMode {
  const m = ls(MODE_KEY);
  return isTier(m) ? m : "auto";
}

/** Cheap synchronous guess from static device capabilities. */
export function guessTierFromHints(): PerfTier {
  if (typeof navigator === "undefined") return "high";
  try {
    const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const conn = (navigator as unknown as { connection?: { saveData?: boolean } }).connection;
    if (reduced || conn?.saveData) return "low";
    const mem   = (navigator as unknown as { deviceMemory?: number }).deviceMemory; // GB, Chromium only
    const cores = navigator.hardwareConcurrency || 0;
    if ((mem && mem <= 2) || (cores && cores <= 2)) return "low";
    if ((mem && mem <= 4) || (cores && cores <= 4)) return "mid";
  } catch {}
  return "high";
}

/** The tier we should currently render at, honoring a forced mode. */
export function getPerfTier(): PerfTier {
  const mode = getPerfMode();
  if (mode !== "auto") return mode;
  const cached = ls(TIER_KEY);
  return isTier(cached) ? cached : guessTierFromHints();
}

export function applyPerfClass(tier: PerfTier): void {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  el.classList.toggle("perf-high", tier === "high");
  el.classList.toggle("perf-mid",  tier === "mid");
  el.classList.toggle("perf-low",  tier === "low");
}

function notify() { if (typeof window !== "undefined") window.dispatchEvent(new Event(PERF_EVENT)); }

/** Persist a newly-measured tier (auto mode) and apply it live. */
export function recordAutoTier(tier: PerfTier): void {
  lsSet(TIER_KEY, tier);
  applyPerfClass(tier);
  notify();
}

/** Force a tier (or back to 'auto'). Used by a future Settings control. */
export function setPerfMode(mode: PerfMode): void {
  lsSet(MODE_KEY, mode);
  applyPerfClass(getPerfTier());
  notify();
}
