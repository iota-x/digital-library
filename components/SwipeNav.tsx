"use client";
import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

const ROUTES = ["/", "/timeline", "/journal", "/capsule", "/shared", "/map"];

export default function SwipeNav() {
  const router   = useRouter();
  const pathname = usePathname();
  const startX   = useRef<number | null>(null);
  const startY   = useRef<number | null>(null);

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
    };
    const onEnd = (e: TouchEvent) => {
      if (startX.current === null || startY.current === null) return;
      const dx = e.changedTouches[0].clientX - startX.current;
      const dy = e.changedTouches[0].clientY - startY.current;
      startX.current = null;
      startY.current = null;

      // Only fire if clearly more horizontal than vertical, and past threshold
      if (Math.abs(dx) < 64 || Math.abs(dy) > Math.abs(dx) * 0.7) return;

      const idx = ROUTES.indexOf(pathname);
      if (idx === -1) return;
      if (dx < 0 && idx < ROUTES.length - 1) router.push(ROUTES[idx + 1]);
      if (dx > 0 && idx > 0)                 router.push(ROUTES[idx - 1]);
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend",   onEnd,   { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend",   onEnd);
    };
  }, [pathname, router]);

  return null;
}
