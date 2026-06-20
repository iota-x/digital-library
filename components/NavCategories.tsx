"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { NAV_MENU, isActive, categoryActive } from "@/lib/nav";
import { buzz } from "@/lib/haptics";

/**
 * Purpose-grouped navigation: a short row of category pills (Home · Connect ·
 * Memories · Fun · Capsule). Single-page categories link directly; multi-page
 * ones reveal a dropdown.
 *
 * The dropdown opens on hover via pure CSS (`.nav-cat-group:hover`) — no JS
 * timers or close-delays, so it's perfectly consistent. A transparent
 * padding-bridge on the menu keeps the hover area continuous from the pill to
 * the panel (no dead zone in the gap). Click/tap also toggles it (via
 * `data-open`) for touch devices and the mobile dock.
 */
export default function NavCategories({ dock = false }: { dock?: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(null), [path]);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(null); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); window.removeEventListener("keydown", onKey); };
  }, []);

  return (
    <div ref={wrapRef} className={`nav-cats${dock ? " nav-cats-dock" : ""}`} role="navigation" aria-label="sections">
      {NAV_MENU.map((c) => {
        const active = categoryActive(c, path);

        if (c.href) {
          return (
            <Link key={c.label} href={c.href} className="nav-cat-pill" data-active={active ? "true" : "false"}>
              <span aria-hidden className="ncp-emoji">{c.emoji}</span>
              <span className="ncp-label">{c.label}</span>
            </Link>
          );
        }

        const isOpen = open === c.label;
        return (
          <div key={c.label} className="nav-cat-group" data-open={isOpen ? "true" : "false"}>
            <button className="nav-cat-pill" data-active={active ? "true" : "false"} aria-expanded={isOpen}
              onClick={() => { buzz("tap"); setOpen(isOpen ? null : c.label); }}>
              <span aria-hidden className="ncp-emoji">{c.emoji}</span>
              <span className="ncp-label">{c.label}</span>
              <span aria-hidden className="ncp-caret">▾</span>
            </button>

            <div className="nav-cat-menu">
              <div className="nav-cat-menu-inner">
                {c.items!.map((it) => {
                  const a = isActive(it.href, path);
                  return (
                    <Link key={it.href} href={it.href} className="nav-cat-item" data-active={a ? "true" : "false"} onClick={() => setOpen(null)}>
                      <span aria-hidden className="nci-emoji">{it.emoji}</span>
                      <span style={{ minWidth: 0 }}>
                        <span className="nci-label">{it.label}</span>
                        <span className="nci-desc">{it.desc}</span>
                      </span>
                      <span aria-hidden className="nci-arrow">→</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
