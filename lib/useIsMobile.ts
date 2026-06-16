"use client";
import { useEffect, useState } from "react";

/**
 * Returns true on touch-primary devices. Subscribes to `(pointer: coarse)`
 * media query so it auto-updates if the user docks a desktop with a mouse.
 *
 * SSR-safe: returns `false` until mounted, so server markup stays consistent.
 */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(pointer: coarse)");
    const apply = () => setMobile(mql.matches);
    apply();
    mql.addEventListener?.("change", apply);
    return () => mql.removeEventListener?.("change", apply);
  }, []);
  return mobile;
}

/**
 * Convenience: returns `undefined` on mobile (so Framer Motion skips the
 * `whileHover` listener entirely), otherwise the provided variant.
 *
 * Usage:
 *   const noHover = useNoHoverOnMobile();
 *   <motion.button whileHover={noHover({ scale: 1.04 })} />
 *
 * Why: every `whileHover` on a list of items registers pointer listeners
 * even on touch where they can never fire. With 100 list items that's 100
 * pointer subscriptions for zero benefit + non-trivial paint cost.
 */
export function useNoHoverOnMobile() {
  const mobile = useIsMobile();
  return <T,>(variant: T): T | undefined => (mobile ? undefined : variant);
}
