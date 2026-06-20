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
 * ones reveal a dropdown — on hover on desktop, on tap on the mobile dock.
 * Used inline in the top bar and, with `dock`, as a floating bottom dock.
 */
export default function NavCategories({ dock = false }: { dock?: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearClose = () => { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; } };
  const scheduleClose = () => { clearClose(); closeTimer.current = setTimeout(() => setOpen(null), 140); };

  useEffect(() => { setOpen(null); clearClose(); }, [path]);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(null); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); window.removeEventListener("keydown", onKey); };
  }, []);

  // Hover intent (desktop only — touch devices use tap).
  const onEnter = (label: string) => { if (dock) return; clearClose(); setOpen(label); };
  const onLeave = () => { if (dock) return; scheduleClose(); };

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
          <div key={c.label} style={{ position: "relative", display: "flex" }}
            onMouseEnter={() => onEnter(c.label)} onMouseLeave={onLeave}>
            <button
              className="nav-cat-pill"
              data-active={active ? "true" : "false"}
              data-open={isOpen ? "true" : "false"}
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
                  initial={{ opacity: 0, y: dock ? 10 : -10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: dock ? 8 : -8, scale: 0.97 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className="nav-cat-menu"
                  style={dock ? { bottom: "calc(100% + 0.6rem)" } : { top: "calc(100% + 0.5rem)" }}
                  onMouseEnter={clearClose} onMouseLeave={onLeave}
                >
                  {/* invisible bridge so the cursor can cross the gap without closing */}
                  <span aria-hidden className="nav-cat-bridge" style={dock ? { top: "auto", bottom: -12 } : { top: -12 }} />
                  {c.items!.map((it, i) => {
                    const a = isActive(it.href, path);
                    return (
                      <motion.div key={it.href}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.03 * i, duration: 0.2 }}>
                        <Link href={it.href} className="nav-cat-item" data-active={a ? "true" : "false"} onClick={() => setOpen(null)}>
                          <span aria-hidden className="nci-emoji">{it.emoji}</span>
                          <span style={{ minWidth: 0 }}>
                            <span className="nci-label">{it.label}</span>
                            <span className="nci-desc">{it.desc}</span>
                          </span>
                          <span aria-hidden className="nci-arrow">→</span>
                        </Link>
                      </motion.div>
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
