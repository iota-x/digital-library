"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_ITEMS, isActive } from "@/lib/nav";

/**
 * Fixed-bottom tab bar shown only on coarse-pointer devices (phones/tablets).
 *
 * The visibility breakpoint and safe-area padding live in globals.css under
 * `.bottom-tabs` so the bar disappears on desktop without any JS. It shows the
 * PRIMARY_ITEMS (the most-used surfaces) plus a "more" tab that opens the
 * grouped menu (handled by Navbar via the `annapp:open-menu` event), so every
 * other destination is one tap away without crowding the bar.
 */

function openMenu() {
  window.dispatchEvent(new Event("annapp:open-menu"));
}

export default function MobileTabBar() {
  const path = usePathname();
  return (
    <nav className="bottom-tabs" aria-label="primary navigation">
      {PRIMARY_ITEMS.map((t) => {
        const active = isActive(t.href, path);
        return (
          <Link key={t.href} href={t.href} data-active={active ? "true" : "false"} aria-current={active ? "page" : undefined}>
            <span aria-hidden className="bt-icon">{t.emoji}</span>
            <span>{t.label}</span>
          </Link>
        );
      })}
      <button type="button" onClick={openMenu} aria-label="more">
        <span aria-hidden className="bt-icon">⋯</span>
        <span>more</span>
      </button>
    </nav>
  );
}
