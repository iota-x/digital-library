"use client";
/**
 * Per-device UI preferences (NOT couple settings) — calm/reduced-motion and
 * hiding ambient decorations. These are personal + instant: stored in
 * localStorage, applied as `<html>` classes, and broadcast via an event so
 * MotionRoot can update framer-motion's reducedMotion live. The anti-FOUC
 * bootstrap in app/layout.tsx applies the classes before first paint.
 */

const RM_KEY  = "ann_reduce_motion";
const AMB_KEY = "ann_hide_ambient";
export const UIPREFS_EVENT = "annapp:uiprefs";

function read(key: string): boolean {
  if (typeof localStorage === "undefined") return false;
  try { return localStorage.getItem(key) === "1"; } catch { return false; }
}
function write(key: string, val: boolean) {
  try { localStorage.setItem(key, val ? "1" : "0"); } catch {}
}

function applyClasses() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("reduce-motion", read(RM_KEY));
  document.documentElement.classList.toggle("no-ambient", read(AMB_KEY));
}

function notify() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(UIPREFS_EVENT));
}

export function getReduceMotion(): boolean { return read(RM_KEY); }
export function getHideAmbient(): boolean { return read(AMB_KEY); }

export function setReduceMotion(v: boolean): void { write(RM_KEY, v); applyClasses(); notify(); }
export function setHideAmbient(v: boolean): void { write(AMB_KEY, v); applyClasses(); notify(); }
