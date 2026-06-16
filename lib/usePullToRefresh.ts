"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Pull-to-refresh for touch devices.
 *
 * Hook attaches passive touch listeners on `window` (so users can pull from
 * anywhere near the top of the page) and only engages when:
 *   - the touch starts while `document.scrollingElement.scrollTop === 0`
 *   - the pull is downward and dominant over horizontal motion
 *
 * The indicator visual lives in CSS (`.ptr-indicator`); the hook drives a
 * `--ptr-pull` and `--ptr-opacity` custom property on the wrapper so the
 * animation runs on the compositor, not in React state.
 *
 * Usage:
 *   const { trackRef, refreshing } = usePullToRefresh(async () => { await load(); });
 *   return (
 *     <div ref={trackRef} className="ptr-track">
 *       <div className={`ptr-indicator ${refreshing ? "spinning" : ""}`}>↻</div>
 *       …content…
 *     </div>
 *   );
 */
export function usePullToRefresh(onRefresh: () => Promise<unknown> | void) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [refreshing, setRefreshing] = useState(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    if (typeof window === "undefined") return;
    // Skip on non-touch devices — the gesture has no surface
    if (!matchMedia("(pointer: coarse)").matches) return;

    const THRESHOLD = 70;
    const MAX_PULL  = 130;
    let startY: number | null = null;
    let startX: number | null = null;
    let pulling = false;

    const setVars = (pull: number) => {
      const clamped = Math.max(0, Math.min(MAX_PULL, pull));
      track.style.setProperty("--ptr-pull", `${clamped}px`);
      track.style.setProperty("--ptr-opacity", String(Math.min(1, clamped / THRESHOLD)));
    };

    const onStart = (e: TouchEvent) => {
      if (refreshing) return;
      const scrollTop = (document.scrollingElement?.scrollTop ?? window.scrollY) || 0;
      if (scrollTop > 0) return;
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      pulling = false;
    };

    const onMove = (e: TouchEvent) => {
      if (startY === null || startX === null) return;
      const dy = e.touches[0].clientY - startY;
      const dx = Math.abs(e.touches[0].clientX - startX);
      // Require dominant vertical motion before we engage — sideways swipes
      // (e.g. SwipeNav) shouldn't trigger refresh
      if (!pulling && dy > 6 && dy > dx * 1.5) pulling = true;
      if (!pulling) return;
      if (dy <= 0) { setVars(0); return; }
      // Rubber-band damping so 200px of finger travel ≈ 130px of indicator
      const damped = dy * 0.55;
      setVars(damped);
    };

    const onEnd = async () => {
      if (!pulling) { startY = null; startX = null; return; }
      const pulledRaw = parseFloat(track.style.getPropertyValue("--ptr-pull") || "0");
      startY = null; startX = null; pulling = false;
      if (pulledRaw >= THRESHOLD) {
        setRefreshing(true);
        setVars(THRESHOLD);
        try { await onRefreshRef.current(); } catch {}
        setRefreshing(false);
      }
      setVars(0);
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove",  onMove,  { passive: true });
    window.addEventListener("touchend",   onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove",  onMove);
      window.removeEventListener("touchend",   onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [refreshing]);

  return { trackRef, refreshing };
}
