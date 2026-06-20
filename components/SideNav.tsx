"use client";
import { useEffect, useState } from "react";

export interface SideNavItem { id: string; label: string }

/**
 * Professional in-page section nav — a slim vertical rail of dots pinned to the
 * right edge. The active section's dot fills and its label shows; hovering any
 * dot reveals its label; clicking smooth-scrolls to it. Fixed-position and
 * decorative, so it never affects document flow or scrolling. Desktop only
 * (hidden under 1000px via `.side-nav` in globals.css).
 */
export default function SideNav({ items }: { items: SideNavItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => !!e);
    if (els.length < 2) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [items]);

  if (items.length < 2) return null;

  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <nav className="side-nav" aria-label="on this page">
      {items.map((it) => {
        const on = active === it.id;
        return (
          <button key={it.id} type="button" onClick={() => go(it.id)}
            className="side-nav-item" data-active={on ? "true" : "false"}
            aria-current={on ? "true" : undefined} aria-label={it.label}>
            <span className="sn-label">{it.label}</span>
            <span aria-hidden className="sn-dot" />
          </button>
        );
      })}
    </nav>
  );
}
