"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { NAV_ITEMS, isActive } from "@/lib/nav";

/**
 * The whole navigation, always visible — a single horizontally-scrollable rail
 * of every destination. No menu to open: one tap goes anywhere, and the active
 * pill auto-scrolls to centre so you always see where you are and what's next.
 * Used in the desktop top bar and the mobile bottom dock.
 */
export default function NavRail({ dock = false }: { dock?: boolean }) {
  const path = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('[data-active="true"]');
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [path]);

  return (
    <div ref={ref} className={`nav-rail${dock ? " nav-rail-dock" : ""}`} role="navigation" aria-label="sections">
      {NAV_ITEMS.map((it) => {
        const active = isActive(it.href, path);
        return (
          <Link key={it.href} href={it.href} className="nav-rail-pill" data-active={active ? "true" : "false"} aria-current={active ? "page" : undefined}>
            <span aria-hidden className="nrp-emoji">{it.emoji}</span>
            <span className="nrp-label">{it.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
