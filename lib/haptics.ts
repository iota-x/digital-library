"use client";
/**
 * Tiny haptics + soft chime helpers.
 *
 * Both are no-ops on devices/browsers that don't support them, so call
 * freely. Pattern: import at the top of an interactive component and call
 * at the moment something happens — drop a sticker, finish a streak,
 * receive a heart.
 *
 * Why custom audio instead of `<audio>`? Two reasons:
 *   1) Bundle weight — a short oscillator sound is bytes, not kilobytes.
 *   2) iOS Safari is fussy about autoplay; a WebAudio gesture lands fine
 *      inside a click handler.
 */

const SHORT_TAP = 8;
const MED_TAP = 18;
const PATTERN_DOUBLE = [10, 60, 10];

export function buzz(kind: "tap" | "med" | "double" = "tap") {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    if (kind === "tap")     navigator.vibrate(SHORT_TAP);
    if (kind === "med")     navigator.vibrate(MED_TAP);
    if (kind === "double")  navigator.vibrate(PATTERN_DOUBLE);
  } catch {}
}

let audioCtx: AudioContext | null = null;
function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (audioCtx) return audioCtx;
  const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!C) return null;
  try { audioCtx = new C(); } catch { return null; }
  return audioCtx;
}

/**
 * A short soft chime — a single pitched note that decays in ~0.3s.
 * Sounds like a tiny xylophone tap. Volume 0–1.
 */
export function chime(volume = 0.18) {
  const c = ctx();
  if (!c) return;
  // Resume if suspended (Safari requires this inside a user gesture)
  if (c.state === "suspended") c.resume().catch(() => {});
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1320, c.currentTime + 0.08);
  gain.gain.setValueAtTime(volume, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.32);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.35);
}

/** Heartbeat-ish double-bump — for receiving a heart from your partner. */
export function heartBump(volume = 0.22) {
  const c = ctx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  const t = c.currentTime;
  const play = (start: number, freq: number) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
    osc.connect(gain).connect(c.destination);
    osc.start(start);
    osc.stop(start + 0.2);
  };
  play(t,        520);
  play(t + 0.12, 660);
}
