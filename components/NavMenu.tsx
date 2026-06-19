"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useUserData, clearUserData } from "@/lib/userStore";
import { invalidateCalendarCache } from "@/lib/calendarStore";
import { daysTogether } from "@/lib/relationship";
import { NAV_GROUPS, isActive } from "@/lib/nav";
import { SERIF, SANS, SCRIPT } from "@/lib/typography";
import { buzz } from "@/lib/haptics";

/**
 * Full-screen navigation menu — the single "go anywhere" surface. One tap opens
 * a frosted overlay with the days-together header and every destination as a
 * big, grouped card (active one highlighted), plus quick actions. Replaces the
 * old cramped desktop dropdown + mobile hamburger with one consistent, slick
 * surface across all sizes.
 */
export default function NavMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useUserData();
  const path = usePathname();
  const [dark, setDark] = useState(false);

  useEffect(() => { setDark(document.documentElement.classList.contains("dark")); }, [open]);

  // Lock body scroll + close on ESC while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  const days = daysTogether(user?.startDate) + 1;

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
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "radial-gradient(120% 120% at 50% 0%, rgba(var(--pink-light-rgb,252,231,243),0.96), rgba(var(--cream-rgb,255,245,248),0.97))",
            backdropFilter: "blur(22px)", WebkitBackdropFilter: "blur(22px)",
            overflowY: "auto",
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ minHeight: "100dvh", boxSizing: "border-box", maxWidth: 760, margin: "0 auto", padding: "clamp(1.2rem,4vw,2rem) clamp(1rem,4vw,1.6rem) clamp(2rem,6vh,3rem)" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.4rem" }}>
              <div>
                <p style={{ fontFamily: SCRIPT, fontSize: "1.1rem", color: "var(--muted)", margin: 0 }}>
                  {user?.partnerName ? `${user.name} & ${user.partnerName}` : "your little world"}
                </p>
                <p style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: "clamp(1.5rem,5vw,2rem)", color: "var(--pink-deep)", margin: "0.1rem 0 0" }}>
                  day {days} of us 💗
                </p>
              </div>
              <motion.button onClick={onClose} whileTap={{ scale: 0.9 }} aria-label="close menu"
                style={{ width: 42, height: 42, borderRadius: "50%", border: "1px solid rgba(var(--pink-mid-rgb,249,168,212),0.5)", background: "rgba(255,255,255,0.6)", color: "var(--pink-deep)", fontSize: "1.1rem", cursor: "pointer", flexShrink: 0 }}>
                ✕
              </motion.button>
            </div>

            {/* Grouped destinations */}
            {NAV_GROUPS.map((g, gi) => (
              <div key={g.title} style={{ marginBottom: "1.3rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", marginBottom: "0.6rem" }}>
                  <span style={{ fontFamily: SANS, fontSize: "0.64rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--pink-deep)" }}>{g.title}</span>
                  <span style={{ flex: 1, height: 1, background: "linear-gradient(90deg,rgba(var(--pink-deep-rgb),.25),transparent)" }} />
                </div>
                <div style={{ display: "grid", gap: "0.6rem", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))" }}>
                  {g.items.map((it, ii) => {
                    const active = isActive(it.href, path);
                    return (
                      <motion.div key={it.href}
                        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.04 * (gi * 4 + ii), duration: 0.3 }}>
                        <Link href={it.href} onClick={() => { buzz("tap"); onClose(); }} style={{ textDecoration: "none" }}>
                          <div style={{
                            display: "flex", gap: "0.8rem", alignItems: "center",
                            padding: "0.85rem 1rem", borderRadius: 18,
                            background: active ? "linear-gradient(135deg,var(--pink),var(--pink-deep))" : "rgba(255,255,255,0.72)",
                            border: `1px solid rgba(var(--pink-mid-rgb,249,168,212),${active ? "0" : "0.45"})`,
                            boxShadow: active ? "0 10px 26px rgba(var(--pink-deep-rgb),0.3)" : "0 4px 16px rgba(var(--pink-deep-rgb),0.07)",
                          }}>
                            <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>{it.emoji}</span>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontFamily: SANS, fontSize: "0.9rem", fontWeight: 700, color: active ? "#fff" : "var(--pink-deep)", margin: "0 0 0.1rem" }}>{it.label}</p>
                              <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: active ? "rgba(255,255,255,0.9)" : "var(--muted)", margin: 0, lineHeight: 1.35 }}>{it.desc}</p>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Quick actions */}
            {user && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.6rem" }}>
                <button onClick={customize} style={actionBtn()}>🎨 customize</button>
                <button onClick={toggleDark} style={actionBtn()}>{dark ? "☀️ light mode" : "🌙 dark mode"}</button>
                <button onClick={() => { onClose(); window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true })); }} style={actionBtn()}>🔍 search ⌘K</button>
                <button onClick={signOut} style={{ ...actionBtn(), color: "var(--muted)" }}>👋 sign out</button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function actionBtn(): React.CSSProperties {
  return {
    flex: "1 1 auto", textAlign: "center",
    padding: "0.65rem 1rem", borderRadius: 14, cursor: "pointer",
    border: "1px solid rgba(var(--pink-mid-rgb,249,168,212),0.4)",
    background: "rgba(255,255,255,0.6)",
    fontFamily: SANS, fontSize: "0.8rem", fontWeight: 600, color: "var(--pink-deep)",
  };
}
