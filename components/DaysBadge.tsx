"use client";
import { useEffect } from "react";
import { useUserData } from "@/lib/userStore";
import { daysTogether } from "@/lib/relationship";

/**
 * Sets the installed-PWA app-icon badge to the number of days together —
 * the closest a PWA can get to a glanceable "lock-screen widget" without a
 * native app. Supported on installed PWAs in Chromium browsers (desktop +
 * Android); a silent no-op everywhere else.
 *
 * Recomputed on mount, when the start date changes, and once a day so the
 * count rolls over even if the app is left open.
 */
export default function DaysBadge() {
  const user = useUserData();
  const startDate = user?.startDate;

  useEffect(() => {
    const nav = typeof navigator !== "undefined"
      ? (navigator as Navigator & {
          setAppBadge?: (n?: number) => Promise<void>;
          clearAppBadge?: () => Promise<void>;
        })
      : null;
    if (!nav?.setAppBadge) return;

    const apply = () => { nav.setAppBadge?.(daysTogether(startDate)).catch(() => {}); };
    apply();

    // Roll the count over at the next local midnight, then every 24h.
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 5, 0);
    const toMidnight = nextMidnight.getTime() - now.getTime();

    let dayTimer: ReturnType<typeof setInterval> | null = null;
    const midnightTimer = setTimeout(() => {
      apply();
      dayTimer = setInterval(apply, 86_400_000);
    }, toMidnight);

    return () => {
      clearTimeout(midnightTimer);
      if (dayTimer) clearInterval(dayTimer);
    };
  }, [startDate]);

  return null;
}
