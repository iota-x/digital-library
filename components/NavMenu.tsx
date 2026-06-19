"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useUserData, clearUserData } from "@/lib/userStore";
import { invalidateCalendarCache } from "@/lib/calendarStore";
import { todayDayNumber } from "@/lib/relationship";
import { NAV_GROUPS, isActive } from "@/lib/nav";
import { SERIF, SANS } from "@/lib/typography";
import { buzz } from "@/lib/haptics";

/**
 * App-launcher style menu. A compact, centred panel of icon tiles (emoji +
 * one-word label) grouped into three rows — quick to scan and tap, instead of a
 * wall of text. Replaces the earlier full-screen card list that was hard to
 * navigate.
 */
export default function NavMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useUserData();
  const path = usePathname();
  const [dark, setDark] = useState(false);

  useEffect(() => { setDark(document.documentElement.classList.contains("dark")); }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  const days = todayDayNumber(user?.startDate);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("ann_theme", next ? "dark" : "light"); } catch {}
    window.dispatchEvent(new Event("annapp:theme"));
  };
  const customize = () => { onClose(); window.dispatchEvent(new Event("annapp:settings")); };
  const signOut = async () => {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch {}
    clearUserData(); invalidateCalendarCache(); window.location.href = "/";
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            display: "flex", alignItems: "flex-start", justifyContent: "center",
            padding: "clamp(0.6rem,3vw,2rem)", paddingTop: "clamp(3.5rem,9vh,5rem)",
            background: "rgba(var(--pink-deep-rgb,190,24,93),0.18)",
            backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            overflowY: "auto",
          }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: -18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            style={{
              width: "100%", maxWidth: 540,
              background: dark ? "rgba(20,8,30,0.96)" : "rgba(var(--cream-rgb,255,245,248),0.98)",
              border: "1px solid rgba(var(--pink-mid-rgb,249,168,212),0.4)",
              borderRadius: 26, padding: "clamp(1rem,3vw,1.4rem)",
              boxShadow: "0 30px 80px rgba(var(--pink-deep-rgb,190,24,93),0.35)",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <p style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: "1.15rem", color: "var(--pink-deep)", margin: 0 }}>
                day {days} of us 💗
              </p>
              <motion.button onClick={onClose} whileTap={{ scale: 0.9 }} aria-label="close menu"
                style={{ width: 34, height: 34, borderRadius: "50%", border: "1px solid rgba(var(--pink-mid-rgb,249,168,212),0.5)", background: "rgba(255,255,255,0.5)", color: "var(--pink-deep)", fontSize: "0.95rem", cursor: "pointer" }}>
                ✕
              </motion.button>
            </div>

            {/* Tile groups */}
            {NAV_GROUPS.map((g) => (
              <div key={g.title} style={{ marginBottom: "0.9rem" }}>
                <p style={{ fontFamily: SANS, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(var(--pink-deep-rgb),.45)", margin: "0 0 0.5rem 0.2rem" }}>{g.title}</p>
                <div style={{ display: "grid", gap: "0.55rem", gridTemplateColumns: "repeat(auto-fill,minmax(86px,1fr))" }}>
                  {g.items.map((it) => {
                    const active = isActive(it.href, path);
                    return (
                      <Link key={it.href} href={it.href} onClick={() => { buzz("tap"); onClose(); }} style={{ textDecoration: "none" }}>
                        <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }}
                          style={{
                            display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem",
                            padding: "0.85rem 0.4rem", borderRadius: 18, textAlign: "center",
                            background: active ? "linear-gradient(160deg,var(--pink),var(--pink-deep))" : (dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.7)"),
                            border: `1px solid rgba(var(--pink-mid-rgb,249,168,212),${active ? "0" : "0.4"})`,
                            boxShadow: active ? "0 8px 20px rgba(var(--pink-deep-rgb,190,24,93),0.3)" : "0 2px 8px rgba(var(--pink-deep-rgb,190,24,93),0.06)",
                          }}>
                          <span style={{ fontSize: "1.7rem", lineHeight: 1 }}>{it.emoji}</span>
                          <span style={{ fontFamily: SANS, fontSize: "0.68rem", fontWeight: 700, color: active ? "#fff" : "var(--pink-deep)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{it.label}</span>
                        </motion.div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Quick actions */}
            {user && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.4rem", borderTop: "1px solid rgba(var(--pink-mid-rgb,249,168,212),0.25)", paddingTop: "0.8rem" }}>
                <button onClick={customize} style={action()}>🎨 customize</button>
                <button onClick={toggleDark} style={action()}>{dark ? "☀️ light" : "🌙 dark"}</button>
                <button onClick={() => { onClose(); window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true })); }} style={action()}>🔍 search</button>
                <button onClick={signOut} style={{ ...action(), color: "var(--muted)" }}>👋 sign out</button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function action(): React.CSSProperties {
  return {
    flex: "1 1 auto", textAlign: "center", padding: "0.55rem 0.8rem", borderRadius: 12, cursor: "pointer",
    border: "1px solid rgba(var(--pink-mid-rgb,249,168,212),0.4)", background: "rgba(255,255,255,0.55)",
    fontFamily: SANS, fontSize: "0.76rem", fontWeight: 600, color: "var(--pink-deep)", whiteSpace: "nowrap",
  };
}
