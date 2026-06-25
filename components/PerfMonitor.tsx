"use client";
import { useEffect } from "react";
import { getPerfMode, getPerfTier, applyPerfClass, recordAutoTier, lower } from "@/lib/perfTier";

/* Live frame-rate watchdog. In 'auto' mode it samples FPS in short windows and,
   if the device sustains jank, drops the visual tier one step (high → mid → low)
   and remembers it. It only ever downgrades — we don't auto-upgrade, to avoid
   oscillating when a single heavy screen briefly stutters. Stops measuring once
   it hits the floor or after the device proves it can hold a smooth frame rate,
   so the watchdog itself costs nothing in steady state. */
export default function PerfMonitor() {
  useEffect(() => {
    // Reconcile the class with our resolved tier on mount (covers a forced mode
    // and any drift from the pre-paint bootstrap).
    applyPerfClass(getPerfTier());

    if (getPerfMode() !== "auto") return;   // pinned — don't measure
    if (getPerfTier() === "low") return;    // already at the floor

    const WINDOW = 1500;   // ms per sample window
    const WARMUP = 1200;   // ignore initial mount jank
    const MIN_FPS = 45;    // sustained below this = struggling
    const BAD_LIMIT = 2;   // consecutive bad windows before downgrading
    const GOOD_LIMIT = 20; // consecutive good windows → device is fine, stop

    let raf = 0, last = performance.now(), frames = 0, elapsed = 0;
    let bad = 0, good = 0, warm = true;
    const warmTimer = setTimeout(() => { warm = false; last = performance.now(); }, WARMUP);

    const tick = (now: number) => {
      const dt = now - last; last = now;
      raf = requestAnimationFrame(tick);
      if (warm) return;
      // Discard tab-switch / GC stalls so they can't masquerade as low FPS.
      if (dt > 200) { frames = 0; elapsed = 0; return; }
      frames++; elapsed += dt;
      if (elapsed < WINDOW) return;

      const fps = (frames * 1000) / elapsed;
      frames = 0; elapsed = 0;
      if (fps < MIN_FPS) {
        good = 0;
        if (++bad >= BAD_LIMIT) {
          const next = lower(getPerfTier());
          recordAutoTier(next);
          bad = 0;
          if (next === "low") cancelAnimationFrame(raf); // floor reached, stop
        }
      } else {
        bad = 0;
        if (++good >= GOOD_LIMIT) cancelAnimationFrame(raf); // proven smooth, stop
      }
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); clearTimeout(warmTimer); };
  }, []);
  return null;
}
