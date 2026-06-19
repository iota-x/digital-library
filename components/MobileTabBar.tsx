"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Fixed-bottom tab bar shown only on coarse-pointer devices (phones/tablets).
 *
 * The visibility breakpoint and safe-area padding live in globals.css under
 * `.bottom-tabs` so the bar disappears on desktop without any JS. Order of
 * tabs intentionally mirrors the most-used surfaces — capsule stays in the
 * hamburger menu since it's visited less often.
 */

const TABS = [
  { href: "/",         label: "home",     icon: "🌸" },
  { href: "/daily",    label: "daily",    icon: "💭" },
  { href: "/journal",  label: "journal",  icon: "📖" },
  { href: "/map",      label: "memories", icon: "📸" },
  { href: "/timeline", label: "story",    icon: "🕰" },
  { href: "/shared",   label: "shared",   icon: "🎬" },
];

export default function MobileTabBar() {
  const path = usePathname();
  return (
    <nav className="bottom-tabs" aria-label="primary navigation">
      {TABS.map(t => {
        const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} data-active={active ? "true" : "false"} aria-current={active ? "page" : undefined}>
            <span aria-hidden className="bt-icon">{t.icon}</span>
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
