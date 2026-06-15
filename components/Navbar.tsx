"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

const ROUTES = [
  { href: "/",         label: "home",      emoji: "🌸" },
  { href: "/timeline", label: "our story",  emoji: "🕰️" },
  { href: "/journal",  label: "journal",   emoji: "📖" },
  { href: "/capsule",  label: "capsule",   emoji: "💌" },
  { href: "/shared",   label: "shared",    emoji: "🎬" },
  { href: "/map",      label: "memories",  emoji: "📸" },
];

function hasNewVoiceNote(): boolean {
  try {
    const latest   = localStorage.getItem("vn_latest")   || "0";
    const lastSeen = localStorage.getItem("vn_last_seen") || "0";
    return latest > lastSeen && latest !== "0";
  } catch { return false; }
}

export default function Navbar() {
  const path        = usePathname();
  const [scrolled,    setScrolled]    = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [dark,        setDark]        = useState(false);
  const [vnBadge,     setVnBadge]     = useState(false);

  /* scroll shadow */
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  /* close mobile menu on route change or ESC */
  useEffect(() => setMobileOpen(false), [path]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  /* dark mode — restore saved preference */
  useEffect(() => {
    const saved = localStorage.getItem("ann_theme");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
      setDark(true);
    }
  }, []);

  /* voice-note badge */
  useEffect(() => {
    setVnBadge(hasNewVoiceNote());
    const refresh = () => setVnBadge(hasNewVoiceNote());
    window.addEventListener("annapp:vn-update", refresh);
    window.addEventListener("annapp:vn-seen",   refresh);
    return () => {
      window.removeEventListener("annapp:vn-update", refresh);
      window.removeEventListener("annapp:vn-seen",   refresh);
    };
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("ann_theme", next ? "dark" : "light");
    window.dispatchEvent(new Event("annapp:theme"));
  };

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: "fixed",
          top: 0, left: 0, right: 0,
          zIndex: 500,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.75rem clamp(1rem, 4vw, 2.5rem)",
          background: scrolled
            ? "rgba(255,245,249,0.85)"
            : "rgba(255,255,255,0.0)",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(249,168,212,0.2)" : "none",
          transition: "background 0.4s, border 0.4s, backdrop-filter 0.4s",
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none" }}>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="occ-heart" style={{ fontSize: "1.3rem", lineHeight: 1 }}>💗</span>
            <span style={{
              fontFamily: '"Georgia", "Times New Roman", serif',
              fontStyle: "italic",
              fontSize: "1.05rem",
              color: "#be185d",
              letterSpacing: "0.02em",
            }}>
              us
            </span>
          </motion.div>
        </Link>

        {/* Desktop tabs */}
        <div style={{
          display: "flex", gap: "0.25rem", alignItems: "center",
          background: "rgba(252,231,243,0.6)",
          border: "1px solid rgba(249,168,212,0.35)",
          borderRadius: 50,
          padding: "0.3rem",
          backdropFilter: "blur(12px)",
        }}
          className="nav-desktop"
        >
          {ROUTES.map(r => {
            const active = r.href === "/" ? path === "/" : path.startsWith(r.href);
            const showBadge = r.href === "/" && vnBadge;
            return (
              <Link key={r.href} href={r.href} style={{ textDecoration: "none" }}>
                <motion.div
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  style={{
                    position: "relative",
                    padding: "0.45rem 1.1rem",
                    borderRadius: 40,
                    display: "flex", alignItems: "center", gap: "0.4rem",
                    background: active ? "linear-gradient(135deg,#f9a8d4,#ec4899)" : "transparent",
                    boxShadow: active ? "0 2px 14px rgba(236,72,153,0.35)" : "none",
                    transition: "background 0.25s, box-shadow 0.25s",
                  }}>
                  <span style={{ fontSize: "0.85rem", lineHeight: 1 }}>{r.emoji}</span>
                  <span style={{
                    fontFamily: "var(--font-lato), 'Inter', system-ui, sans-serif",
                    fontSize: "0.82rem",
                    fontWeight: active ? 700 : 500,
                    color: active ? "#fff" : "rgba(190,24,93,0.7)",
                    letterSpacing: "0.04em",
                    transition: "color 0.25s",
                  }}>
                    {r.label}
                  </span>
                  {showBadge && (
                    <span style={{
                      position: "absolute", top: 4, right: 4,
                      width: 7, height: 7, borderRadius: "50%",
                      background: "#ec4899",
                      boxShadow: "0 0 6px rgba(236,72,153,.7)",
                    }}/>
                  )}
                </motion.div>
              </Link>
            );
          })}
        </div>

        {/* Right cluster: dark toggle + ⌘K */}
        <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
          {/* Dark mode toggle */}
          <motion.button
            onClick={toggleDark}
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            title={dark ? "light mode" : "dark mode"}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 34, height: 34, borderRadius: "50%",
              background: "rgba(252,231,243,.55)",
              border: "1px solid rgba(249,168,212,.35)",
              cursor: "pointer", fontSize: "1rem",
            }}
          >
            {dark ? "☀️" : "🌙"}
          </motion.button>

          {/* ⌘K shortcut hint — desktop only */}
          <button
            className="nav-cmdK"
            onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key:"k", ctrlKey:true, bubbles:true }))}
            style={{
              display:"flex", alignItems:"center", gap:"0.35rem",
              background:"rgba(252,231,243,.55)",
              border:"1px solid rgba(249,168,212,.35)",
              borderRadius:8, padding:"0.32rem 0.65rem",
              cursor:"pointer",
              fontFamily:"var(--font-lato),'Inter',system-ui,sans-serif",
              fontSize:"0.62rem", fontWeight:700,
              color:"rgba(190,24,93,.5)",
              letterSpacing:"0.06em",
            }}>
            <span>⌘K</span>
          </button>

          {/* Mobile hamburger */}
          <motion.button
            onClick={() => setMobileOpen(o => !o)}
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            className="nav-mobile-btn"
            style={{
              background: "rgba(252,231,243,0.7)",
              border: "1px solid rgba(249,168,212,0.35)",
              borderRadius: 10, width: 40, height: 40,
              cursor: "pointer", display: "none",
              alignItems: "center", justifyContent: "center",
              flexDirection: "column", gap: 4, padding: "0.5rem",
              position: "relative",
            }}>
            {[0,1,2].map(i => (
              <motion.div key={i}
                animate={mobileOpen ? {
                  rotate: i === 0 ? 45 : i === 2 ? -45 : 0,
                  y:      i === 0 ? 8  : i === 2 ? -8  : 0,
                  opacity: i === 1 ? 0 : 1,
                } : { rotate: 0, y: 0, opacity: 1 }}
                transition={{ duration: 0.25 }}
                style={{ width: 18, height: 2, background: "#ec4899", borderRadius: 1 }}
              />
            ))}
            {/* Voice note badge on hamburger */}
            {vnBadge && (
              <span style={{
                position:"absolute",top:6,right:6,
                width:7,height:7,borderRadius:"50%",
                background:"#ec4899",
                boxShadow:"0 0 6px rgba(236,72,153,.7)",
              }}/>
            )}
          </motion.button>
        </div>
      </motion.nav>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{
              position: "fixed",
              top: 60, left: "1rem", right: "1rem",
              zIndex: 499,
              background: "rgba(255,245,249,0.96)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(249,168,212,0.3)",
              borderRadius: 20,
              padding: "1rem",
              boxShadow: "0 16px 48px rgba(244,114,182,0.2)",
              display: "flex", flexDirection: "column", gap: "0.4rem",
            }}>
            {ROUTES.map((r, i) => {
              const active     = r.href === "/" ? path === "/" : path.startsWith(r.href);
              const showBadge  = r.href === "/" && vnBadge;
              return (
                <motion.div key={r.href}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}>
                  <Link href={r.href} style={{ textDecoration: "none" }}>
                    <div style={{
                      padding: "0.85rem 1.2rem",
                      borderRadius: 14,
                      background: active ? "linear-gradient(135deg,rgba(249,168,212,0.3),rgba(236,72,153,0.15))" : "transparent",
                      border: active ? "1px solid rgba(236,72,153,0.25)" : "1px solid transparent",
                      display: "flex", alignItems: "center", gap: "0.8rem",
                      position: "relative",
                    }}>
                      <span style={{ fontSize: "1.2rem" }}>{r.emoji}</span>
                      <span style={{
                        fontFamily: '"Georgia","Times New Roman",serif',
                        fontStyle: "italic",
                        fontSize: "1.05rem",
                        color: active ? "#be185d" : "rgba(190,24,93,0.6)",
                        fontWeight: active ? 600 : 400,
                        flex: 1,
                      }}>
                        {r.label}
                      </span>
                      {showBadge && (
                        <span style={{
                          width:8,height:8,borderRadius:"50%",
                          background:"#ec4899",flexShrink:0,
                          boxShadow:"0 0 6px rgba(236,72,153,.7)",
                        }}/>
                      )}
                    </div>
                  </Link>
                </motion.div>
              );
            })}

            {/* Dark mode row in mobile menu */}
            <div style={{ borderTop:"1px solid rgba(249,168,212,.2)", marginTop:"0.3rem", paddingTop:"0.6rem" }}>
              <button
                onClick={toggleDark}
                style={{
                  width:"100%", padding:"0.7rem 1.2rem", borderRadius:14,
                  border:"1px solid rgba(249,168,212,.2)", background:"transparent",
                  display:"flex", alignItems:"center", gap:"0.8rem", cursor:"pointer",
                }}
              >
                <span style={{ fontSize:"1.2rem" }}>{dark ? "☀️" : "🌙"}</span>
                <span style={{
                  fontFamily:'"Georgia","Times New Roman",serif', fontStyle:"italic",
                  fontSize:"1.05rem", color:"rgba(190,24,93,.6)",
                }}>
                  {dark ? "light mode" : "dark mode"}
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Responsive CSS */}
      <style>{`
        @media (max-width: 580px) {
          .nav-desktop { display: none !important; }
          .nav-mobile-btn { display: flex !important; }
          .nav-cmdK { display: none !important; }
        }
      `}</style>

      {/* Top padding spacer */}
      <div style={{ height: 64 }} />
    </>
  );
}
