"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NAV_MENU, isActive, categoryActive } from "@/lib/nav";
import { buzz } from "@/lib/haptics";

/**
 * Purpose-grouped navigation: a short row of category pills (Home · Connect ·
 * Memories · Fun · Capsule). Single-page categories link directly; multi-page
 * ones open a dropdown. Used inline in the desktop top bar and — with `dock` —
 * as a floating bottom dock on phones (dropdowns open upward there).
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

        // Single-page category → plain link.
        if (c.href) {
          return (
            <Link key={c.label} href={c.href} className="nav-cat-pill" data-active={active ? "true" : "false"}>
              <span aria-hidden className="ncp-emoji">{c.emoji}</span>
              <span className="ncp-label">{c.label}</span>
            </Link>
          );
        }

        // Multi-page category → dropdown.
        const isOpen = open === c.label;
        return (
          <div key={c.label} style={{ position: "relative", display: "flex" }}>
            <button
              className="nav-cat-pill"
              data-active={active ? "true" : "false"}
              aria-expanded={isOpen}
              onClick={() => { buzz("tap"); setOpen(isOpen ? null : c.label); }}
            >
              <span aria-hidden className="ncp-emoji">{c.emoji}</span>
              <span className="ncp-label">{c.label}</span>
              <span aria-hidden className="ncp-caret" style={{ transform: isOpen ? "rotate(180deg)" : "none" }}>▾</span>
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, y: dock ? 10 : -10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: dock ? 10 : -10, scale: 0.96 }}
                  transition={{ duration: 0.16 }}
                  className="nav-cat-menu"
                  style={dock ? { bottom: "calc(100% + 0.6rem)" } : { top: "calc(100% + 0.6rem)" }}
                >
                  {c.items!.map((it) => {
                    const a = isActive(it.href, path);
                    return (
                      <Link key={it.href} href={it.href} className="nav-cat-item" data-active={a ? "true" : "false"} onClick={() => setOpen(null)}>
                        <span aria-hidden style={{ fontSize: "1.2rem", lineHeight: 1 }}>{it.emoji}</span>
                        <span style={{ minWidth: 0 }}>
                          <span className="nci-label">{it.label}</span>
                          <span className="nci-desc">{it.desc}</span>
                        </span>
                      </Link>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
