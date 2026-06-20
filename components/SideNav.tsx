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
  const [hint, setHint] = useState(false);

  // First-visit coachmark: reveal all labels for a few seconds so people learn
  // the rail is a jump-nav, then collapse to hover. Shown once, ever.
  useEffect(() => {
    if (items.length < 2) return;
    try { if (localStorage.getItem("ann_sidenav_seen")) return; } catch {}
    setHint(true);
    const t = setTimeout(() => {
      setHint(false);
      try { localStorage.setItem("ann_sidenav_seen", "1"); } catch {}
    }, 5000);
    return () => clearTimeout(t);
  }, [items.length]);

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
    <nav className="side-nav" data-hint={hint ? "true" : "false"} aria-label="on this page"
      onMouseEnter={() => { if (hint) { setHint(false); try { localStorage.setItem("ann_sidenav_seen", "1"); } catch {} } }}>
      {hint && <span className="sn-hint" aria-hidden>jump to a section ↓</span>}
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
