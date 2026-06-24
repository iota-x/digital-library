"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Fire-and-forget page-view beacon. Mounted once in the root layout; the effect
 * re-runs only when the pathname changes, so it sends exactly one beacon per
 * navigation. Uses sendBeacon when available (survives the page unload), falling
 * back to a keepalive fetch. Silent by design — never blocks or surfaces errors.
 */
export default function PageviewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    const body = JSON.stringify({ path: pathname });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
      } else {
        void fetch("/api/track", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
      }
    } catch {
      /* tracking must never throw into the app */
    }
  }, [pathname]);

  return null;
}
