"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Types ─────────────────────────────────────────── */
type Tab = "home" | "timeline" | "calendar" | "capsule";

interface NavItem {
  id: Tab;
  emoji: string;
  label: string;
  sub: string;
}

/* ─── Nav items ──────────────────────────────────────── */
const NAV: NavItem[] = [
  { id: "home",     emoji: "🌸", label: "Home",       sub: "our little world"   },
  { id: "timeline", emoji: "✨", label: "Timeline",   sub: "our story so far"   },
  { id: "calendar",  emoji: "💗", label: "Calendar",    sub: "days & memories"    },
  { id: "capsule",  emoji: "🌙", label: "Time Capsule", sub: "letters to future us" },
];

/* ─── Section ids each tab scrolls to ───────────────── */
const SECTION_IDS: Record<Tab, string> = {
  home:     "home",
  timeline: "timeline",
  calendar:  "calendar",   // OurCalendar uses id="calendar"
  capsule:  "timecapsule",
};

/* ─── Fonts (match existing app) ───────────────────── */
const SERIF  = `"Georgia","Times New Roman",serif`;
const SANS   = `var(--font-lato),"Inter",system-ui,sans-serif`;

/* ─── Helpers ───────────────────────────────────────── */
function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

/* ═══════════════════════════════════════════════════════
   NAVBAR COMPONENT
═══════════════════════════════════════════════════════ */
export default function Navbar({ active, onTabChange }: {
  active: Tab;
  onTabChange: (tab: Tab) => void;
}) {
  const [scrolled,    setScrolled]    = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [hovered,     setHovered]     = useState<Tab | null>(null);

  /* shrink on scroll */
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  /* close mobile menu on resize */
  useEffect(() => {
    const handler = () => { if (window.innerWidth > 640) setMobileOpen(false); };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const handleNav = useCallback((tab: Tab) => {
    onTabChange(tab);
    setMobileOpen(false);
    // short delay so state updates first, then scroll
    setTimeout(() => scrollToSection(SECTION_IDS[tab]), 80);
  }, [onTabChange]);

  return (
    <>
      {/* ── Desktop / tablet navbar ── */}
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 26, delay: 0.1 }}
        style={{
          position: "fixed",
          top: scrolled ? "0.6rem" : "1.1rem",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 8000,
          transition: "top 0.35s ease",
          /* hide on very small screens — mobile bar takes over */
          display: "flex",
          pointerEvents: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.2rem",
            background: scrolled
              ? "rgba(22,7,8,0.88)"
              : "rgba(22,7,8,0.72)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            border: "1px solid rgba(236,72,153,0.18)",
            borderRadius: 999,
            padding: scrolled ? "0.3rem 0.45rem" : "0.38rem 0.55rem",
            boxShadow: "0 8px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(244,114,182,0.06)",
            transition: "padding 0.3s ease, background 0.3s ease",
          }}
        >
          {/* Logo pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.38rem",
              padding: "0.28rem 0.85rem 0.28rem 0.6rem",
              marginRight: "0.25rem",
              borderRight: "1px solid rgba(244,114,182,0.12)",
            }}
          >
            <motion.span
              animate={{ scale: [1, 1.18, 1], rotate: [-4, 4, -4] }}
              transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
              style={{ fontSize: "1.1rem" }}
            >
              💞
            </motion.span>
            <span
              style={{
                fontFamily: SERIF,
                fontStyle: "italic",
                fontSize: "0.95rem",
                color: "#fce7f3",
                fontWeight: 400,
                letterSpacing: "0.01em",
                whiteSpace: "nowrap",
              }}
            >
              us
            </span>
          </div>

          {/* Nav links */}
          {NAV.map((item) => {
            const isActive = active === item.id;
            const isHov    = hovered === item.id;
            return (
              <motion.button
                key={item.id}
                onClick={() => handleNav(item.id)}
                onHoverStart={() => setHovered(item.id)}
                onHoverEnd={() => setHovered(null)}
                whileTap={{ scale: 0.92 }}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.38rem",
                  padding: "0.42rem 0.85rem",
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  background: isActive
                    ? "linear-gradient(135deg,rgba(236,72,153,0.32),rgba(190,24,93,0.22))"
                    : isHov
                    ? "rgba(244,114,182,0.1)"
                    : "transparent",
                  boxShadow: isActive ? "0 2px 14px rgba(236,72,153,0.25),inset 0 0 0 1px rgba(236,72,153,0.28)" : "none",
                  transition: "background 0.18s, box-shadow 0.18s",
                }}
              >
                <span style={{ fontSize: "0.95rem", lineHeight: 1 }}>{item.emoji}</span>
                <span
                  style={{
                    fontFamily: SANS,
                    fontSize: "0.88rem",
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? "#fce7f3" : "rgba(252,231,243,0.55)",
                    letterSpacing: "0.01em",
                    transition: "color 0.18s, font-weight 0.18s",
                    /* hide label on narrow desktop, show emoji only */
                  }}
                >
                  {item.label}
                </span>

                {/* Active underline dot */}
                {isActive && (
                  <motion.div
                    layoutId="nav-active-dot"
                    style={{
                      position: "absolute",
                      bottom: 4,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: "#f9a8d4",
                      boxShadow: "0 0 6px rgba(249,168,212,0.8)",
                    }}
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  />
                )}

                {/* Tooltip on hover */}
                <AnimatePresence>
                  {isHov && !isActive && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.92 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.95 }}
                      transition={{ duration: 0.16 }}
                      style={{
                        position: "absolute",
                        top: "calc(100% + 10px)",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "rgba(22,7,8,0.92)",
                        border: "1px solid rgba(236,72,153,0.2)",
                        borderRadius: 10,
                        padding: "0.3rem 0.65rem",
                        whiteSpace: "nowrap",
                        pointerEvents: "none",
                        zIndex: 10,
                      }}
                    >
                      <span style={{ fontFamily: SANS, fontSize: "0.72rem", color: "rgba(244,114,182,0.65)", letterSpacing: "0.08em" }}>
                        {item.sub}
                      </span>
                      {/* arrow */}
                      <div style={{ position: "absolute", top: -5, left: "50%", transform: "translateX(-50%) rotate(45deg)", width: 8, height: 8, background: "rgba(22,7,8,0.92)", borderLeft: "1px solid rgba(236,72,153,0.2)", borderTop: "1px solid rgba(236,72,153,0.2)" }} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </motion.nav>

      {/* ── Mobile hamburger button (shown ≤ 480 px via inline trick) ── */}
      <motion.button
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 260, damping: 22 }}
        onClick={() => setMobileOpen(o => !o)}
        style={{
          position: "fixed",
          bottom: "1.4rem",
          right: "1.2rem",
          zIndex: 8100,
          width: 54,
          height: 54,
          borderRadius: "50%",
          border: "1px solid rgba(236,72,153,0.3)",
          background: "rgba(22,7,8,0.88)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 6px 28px rgba(0,0,0,0.55), 0 0 0 1px rgba(244,114,182,0.08)",
          /* Only show on mobile — desktop nav handles it.
             We use a data attribute + CSS in globals.css to hide this on desktop,
             but as a fallback it's always visible. Hide it for screens > 640 via
             a simple visibility check rendered in JS: */
        }}
      >
        <motion.span
          animate={{ rotate: mobileOpen ? 45 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          style={{ fontSize: "1.25rem", display: "block", lineHeight: 1 }}
        >
          {mobileOpen ? "✕" : "💗"}
        </motion.span>
      </motion.button>

      {/* ── Mobile slide-up menu ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              style={{ position: "fixed", inset: 0, zIndex: 8050, background: "rgba(6,1,4,0.65)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}
            />

            {/* Menu sheet */}
            <motion.div
              initial={{ opacity: 0, y: 80, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 60, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              style={{
                position: "fixed",
                bottom: "5.2rem",
                right: "1.2rem",
                zIndex: 8060,
                width: "min(88vw, 280px)",
                background: "rgba(20,6,10,0.96)",
                backdropFilter: "blur(28px)",
                WebkitBackdropFilter: "blur(28px)",
                border: "1px solid rgba(236,72,153,0.18)",
                borderRadius: 22,
                padding: "0.8rem",
                boxShadow: "0 20px 70px rgba(0,0,0,0.7), 0 0 0 1px rgba(244,114,182,0.06)",
                display: "flex",
                flexDirection: "column",
                gap: "0.3rem",
              }}
            >
              {/* Header */}
              <div style={{ padding: "0.4rem 0.6rem 0.7rem", borderBottom: "1px solid rgba(244,114,182,0.1)", marginBottom: "0.3rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} style={{ fontSize: "1.1rem" }}>💞</motion.span>
                <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "1rem", color: "#fce7f3" }}>navigate</span>
              </div>

              {NAV.map((item, idx) => {
                const isActive = active === item.id;
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.055, type: "spring", stiffness: 280, damping: 22 }}
                    whileHover={{ x: 4, background: "rgba(236,72,153,0.1)" }}
                    whileTap={{ scale: 0.96 }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.7rem 0.85rem",
                      borderRadius: 14,
                      border: isActive ? "1px solid rgba(236,72,153,0.3)" : "1px solid transparent",
                      background: isActive ? "rgba(236,72,153,0.15)" : "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 0.15s, border 0.15s",
                    }}
                  >
                    <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>{item.emoji}</span>
                    <div>
                      <p style={{ fontFamily: SANS, fontSize: "0.95rem", fontWeight: isActive ? 700 : 500, color: isActive ? "#fce7f3" : "rgba(252,231,243,0.6)", margin: 0, lineHeight: 1.2 }}>
                        {item.label}
                      </p>
                      <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: "rgba(244,114,182,0.38)", margin: "0.15rem 0 0", letterSpacing: "0.06em" }}>
                        {item.sub}
                      </p>
                    </div>
                    {isActive && (
                      <motion.div
                        layoutId="mobile-active"
                        style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#f9a8d4", boxShadow: "0 0 8px rgba(249,168,212,0.7)", flexShrink: 0 }}
                      />
                    )}
                  </motion.button>
                );
              })}

              {/* Decorative footer */}
              <p style={{ fontFamily: SANS, fontSize: "0.65rem", color: "rgba(244,114,182,0.2)", textAlign: "center", margin: "0.5rem 0 0", letterSpacing: "0.12em" }}>
                with love 🌸
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}