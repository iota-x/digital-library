"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useUserData, clearUserData, updateUserData } from "@/lib/userStore";
import { invalidateCalendarCache } from "@/lib/calendarStore";
import { useToast } from "@/components/Toaster";
import { useConfirm } from "@/components/ConfirmDialog";
import NotificationCenter from "@/components/NotificationCenter";
import NavMenu from "@/components/NavMenu";
import { PRIMARY_ITEMS, isActive } from "@/lib/nav";

function hasNewVoiceNote(): boolean {
  try {
    const latest   = Number(localStorage.getItem("vn_latest"))    || 0;
    const lastSeen = Number(localStorage.getItem("vn_last_seen")) || 0;
    return latest > lastSeen && latest !== 0;
  } catch { return false; }
}

export default function Navbar() {
  const path        = usePathname();
  const user        = useUserData();
  const [scrolled,     setScrolled]     = useState(false);
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [dark,         setDark]         = useState(false);
  const [vnBadge,      setVnBadge]      = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [copied,       setCopied]       = useState(false);
  const [rotating,     setRotating]     = useState(false);
  const toaster = useToast();
  const confirm = useConfirm();

  /* scroll shadow */
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  /* close menus on route change or ESC */
  useEffect(() => { setMenuOpen(false); setUserMenuOpen(false); }, [path]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") setUserMenuOpen(false); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  /* the bottom dock's "menu" tab asks us to open the full menu */
  useEffect(() => {
    const open = () => setMenuOpen(true);
    window.addEventListener("annapp:open-menu", open);
    return () => window.removeEventListener("annapp:open-menu", open);
  }, []);

  /* sync toggle button state with whatever DarkOverlay restored */
  useEffect(() => { setDark(document.documentElement.classList.contains("dark")); }, []);

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

  const handleLogout = async () => {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch {}
    clearUserData();
    invalidateCalendarCache();
    window.location.href = "/";
  };

  const copyInviteCode = () => {
    if (!user?.inviteCode) return;
    navigator.clipboard.writeText(user.inviteCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const rotateInviteCode = async () => {
    if (!user || rotating) return;
    const ok = await confirm({
      title: "rotate invite code?",
      body: "A new code will be generated. The old code will stop working immediately. Use this if you accidentally shared the old one.",
      confirmLabel: "rotate",
      cancelLabel: "cancel",
    });
    if (!ok) return;
    setRotating(true);
    try {
      const res = await fetch("/api/couples/invite-code", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toaster.toast({ variant: "error", message: data.error || "Couldn't rotate code", durationMs: 4000 });
        return;
      }
      updateUserData({ inviteCode: data.inviteCode });
      toaster.toast({ variant: "success", title: "new invite code", message: data.inviteCode, durationMs: 6000 });
    } catch {
      toaster.toast({ variant: "error", message: "Network error — try again.", durationMs: 4000 });
    } finally { setRotating(false); }
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
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0.75rem clamp(1rem, 4vw, 2.5rem)",
          background: scrolled
            ? dark ? "rgba(10,4,20,0.88)" : `rgba(var(--pink-light-rgb,255,245,249),0.88)`
            : "rgba(255,255,255,0.0)",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled
            ? dark ? "1px solid rgba(255,255,255,0.1)" : `1px solid rgba(var(--pink-mid-rgb,249,168,212),0.2)`
            : "none",
          transition: "background 0.4s, border 0.4s, backdrop-filter 0.4s",
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none" }}>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="occ-heart" style={{ fontSize: "1.3rem", lineHeight: 1 }}>💗</span>
            <span style={{ fontFamily: '"Georgia", "Times New Roman", serif', fontStyle: "italic", fontSize: "1.05rem", color: "var(--pink-deep)", letterSpacing: "0.02em" }}>
              us
            </span>
          </motion.div>
        </Link>

        {/* Desktop quick tabs (primary only — everything else is in the menu) */}
        <div className="nav-desktop" style={{
          display: "flex", gap: "0.25rem", alignItems: "center",
          background: dark ? "rgba(255,255,255,0.1)" : "rgba(var(--pink-light-rgb,252,231,243),0.6)",
          border: dark ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(var(--pink-mid-rgb,249,168,212),0.35)",
          borderRadius: 50, padding: "0.3rem", backdropFilter: "blur(12px)",
        }}>
          {PRIMARY_ITEMS.map(r => {
            const active = isActive(r.href, path);
            const showBadge = r.href === "/" && vnBadge;
            return (
              <Link key={r.href} href={r.href} style={{ textDecoration: "none" }}>
                <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
                  style={{
                    position: "relative", padding: "0.45rem 1.1rem", borderRadius: 40,
                    display: "flex", alignItems: "center", gap: "0.4rem",
                    background: active ? "linear-gradient(135deg,var(--pink),var(--pink-deep))" : "transparent",
                    boxShadow: active ? `0 2px 14px rgba(var(--pink-deep-rgb,236,72,153),0.35)` : "none",
                    transition: "background 0.25s, box-shadow 0.25s",
                  }}>
                  <span style={{ fontSize: "0.85rem", lineHeight: 1 }}>{r.emoji}</span>
                  <span style={{
                    fontFamily: "var(--font-lato), 'Inter', system-ui, sans-serif", fontSize: "0.82rem",
                    fontWeight: active ? 700 : 500,
                    color: active ? "#fff" : dark ? "var(--text)" : `rgba(var(--pink-deep-rgb,190,24,93),0.7)`,
                    letterSpacing: "0.04em", transition: "color 0.25s",
                  }}>
                    {r.label}
                  </span>
                  {showBadge && (
                    <span style={{ position: "absolute", top: 4, right: 4, width: 7, height: 7, borderRadius: "50%", background: "var(--pink-deep)", boxShadow: `0 0 6px rgba(var(--pink-deep-rgb,236,72,153),.7)` }}/>
                  )}
                </motion.div>
              </Link>
            );
          })}
        </div>

        {/* Right cluster */}
        <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
          {user && <NotificationCenter />}

          {/* Dark mode toggle — desktop only (the menu has it on mobile) */}
          <motion.button onClick={toggleDark} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            className="nav-desktop" title={dark ? "light mode" : "dark mode"}
            style={{
              alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: "50%",
              background: dark ? "rgba(255,255,255,0.1)" : "rgba(var(--pink-light-rgb,252,231,243),.55)",
              border: dark ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(var(--pink-mid-rgb,249,168,212),.35)",
              cursor: "pointer", fontSize: "1rem",
            }}>
            {dark ? "☀️" : "🌙"}
          </motion.button>

          {/* User pill + dropdown — desktop only */}
          {user && (
            <div style={{ position: "relative" }} className="nav-desktop">
              <motion.button onClick={() => setUserMenuOpen(o => !o)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                style={{
                  display: "flex", alignItems: "center", gap: "0.4rem",
                  background: dark ? "rgba(255,255,255,0.12)" : "rgba(var(--pink-light-rgb,252,231,243),.7)",
                  border: dark ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(var(--pink-mid-rgb,249,168,212),.4)",
                  borderRadius: 50, padding: "0.32rem 0.8rem", cursor: "pointer",
                  fontFamily: "var(--font-lato),'Inter',system-ui,sans-serif", fontSize: "0.78rem", color: "var(--pink-deep)", fontWeight: 600,
                }}>
                <span>🌸</span><span>{user.name}</span>
              </motion.button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.95 }} transition={{ duration: 0.18 }}
                    style={{
                      position: "absolute", top: "calc(100% + 0.5rem)", right: 0,
                      background: "var(--cream)", backdropFilter: "blur(20px)",
                      border: "1px solid rgba(var(--pink-mid-rgb,249,168,212),0.35)", borderRadius: 16,
                      padding: "1rem", minWidth: 220, boxShadow: `0 12px 40px rgba(var(--pink-rgb,244,114,182),0.2)`, zIndex: 600,
                    }}>
                    <p style={{ fontFamily: "var(--font-lato),'Inter',system-ui,sans-serif", fontSize: "0.72rem", color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 0.4rem" }}>signed in as</p>
                    <p style={{ fontFamily: '"Georgia","Times New Roman",serif', fontStyle: "italic", fontSize: "1rem", color: "var(--pink-deep)", margin: "0 0 0.8rem", fontWeight: 400 }}>{user.name}</p>
                    {user.partnerName ? (
                      <p style={{ fontFamily: "var(--font-lato),'Inter',system-ui,sans-serif", fontSize: "0.8rem", color: "var(--muted)", margin: "0 0 0.8rem" }}>with {user.partnerName} 💗</p>
                    ) : (
                      <p style={{ fontFamily: "var(--font-lato),'Inter',system-ui,sans-serif", fontSize: "0.78rem", color: "var(--muted)", margin: "0 0 0.8rem", fontStyle: "italic", opacity: 0.7 }}>partner not joined yet</p>
                    )}
                    {user.inviteCode && (
                      <div style={{ marginBottom: "0.8rem" }}>
                        <p style={{ fontFamily: "var(--font-lato),'Inter',system-ui,sans-serif", fontSize: "0.65rem", color: "var(--muted)", letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 0.3rem" }}>invite code</p>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontFamily: '"Georgia","Times New Roman",serif', fontSize: "1.1rem", color: "var(--pink-deep)", letterSpacing: "0.25em", fontWeight: 700 }}>{user.inviteCode}</span>
                          <button onClick={copyInviteCode} style={{ background: "rgba(var(--pink-mid-rgb,249,168,212),0.2)", border: "1px solid rgba(var(--pink-mid-rgb,249,168,212),0.4)", borderRadius: 6, padding: "0.2rem 0.5rem", cursor: "pointer", fontFamily: "var(--font-lato),'Inter',system-ui,sans-serif", fontSize: "0.65rem", color: "var(--pink-deep)" }}>{copied ? "✓" : "copy"}</button>
                          {user.role === "creator" && !user.partnerName && (
                            <button onClick={rotateInviteCode} disabled={rotating} title="generate a new code if you accidentally shared the old one" style={{ background: "transparent", border: "1px solid rgba(var(--pink-mid-rgb,249,168,212),0.4)", borderRadius: 6, padding: "0.2rem 0.5rem", cursor: rotating ? "wait" : "pointer", fontFamily: "var(--font-lato),'Inter',system-ui,sans-serif", fontSize: "0.65rem", color: "var(--muted)" }}>{rotating ? "…" : "rotate"}</button>
                          )}
                        </div>
                      </div>
                    )}
                    <div style={{ borderTop: "1px solid rgba(var(--pink-mid-rgb,249,168,212),0.2)", paddingTop: "0.6rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                      <button onClick={() => { setUserMenuOpen(false); window.dispatchEvent(new Event("annapp:settings")); }} style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: 10, border: dark ? "1px solid rgba(255,255,255,0.15)" : `1px solid rgba(var(--pink-mid-rgb,249,168,212),0.3)`, background: dark ? "rgba(255,255,255,0.08)" : `rgba(var(--pink-light-rgb,252,231,243),0.4)`, cursor: "pointer", fontFamily: "var(--font-lato),'Inter',system-ui,sans-serif", fontSize: "0.82rem", color: "var(--pink-deep)", textAlign: "left", fontWeight: 600 }}>🎨 customize</button>
                      <button onClick={handleLogout} style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: 10, border: "1px solid rgba(var(--pink-mid-rgb,249,168,212),0.3)", background: "transparent", cursor: "pointer", fontFamily: "var(--font-lato),'Inter',system-ui,sans-serif", fontSize: "0.82rem", color: "var(--muted)", textAlign: "left" }}>sign out</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ⌘K — desktop only */}
          <button className="nav-cmdK" onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key:"k", ctrlKey:true, bubbles:true }))}
            style={{
              display:"flex", alignItems:"center", gap:"0.35rem",
              background: dark ? "rgba(255,255,255,0.1)" : `rgba(var(--pink-light-rgb,252,231,243),.55)`,
              border: dark ? "1px solid rgba(255,255,255,0.18)" : `1px solid rgba(var(--pink-mid-rgb,249,168,212),.35)`,
              borderRadius:8, padding:"0.32rem 0.65rem", cursor:"pointer",
              fontFamily:"var(--font-lato),'Inter',system-ui,sans-serif", fontSize:"0.62rem", fontWeight:700,
              color: dark ? "rgba(255,255,255,0.5)" : `rgba(var(--pink-deep-rgb,190,24,93),.5)`, letterSpacing:"0.06em",
            }}>
            <span>⌘K</span>
          </button>

          {/* Menu button — the single "go anywhere" trigger, on every size */}
          <motion.button onClick={() => setMenuOpen(true)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }} aria-label="open menu"
            style={{
              position: "relative", display: "flex", alignItems: "center", gap: "0.4rem",
              height: 38, padding: "0 0.85rem", borderRadius: 50, cursor: "pointer",
              background: "linear-gradient(135deg,var(--pink),var(--pink-deep))", border: "none",
              color: "#fff", boxShadow: "0 4px 16px rgba(var(--pink-deep-rgb,236,72,153),0.3)",
            }}>
            <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ width: 15, height: 2, background: "#fff", borderRadius: 1 }} />
              <span style={{ width: 15, height: 2, background: "#fff", borderRadius: 1 }} />
              <span style={{ width: 15, height: 2, background: "#fff", borderRadius: 1 }} />
            </span>
            <span className="nav-desktop" style={{ fontFamily: "var(--font-lato),'Inter',system-ui,sans-serif", fontSize: "0.8rem", fontWeight: 700 }}>menu</span>
            {vnBadge && (
              <span style={{ position:"absolute", top:5, right:5, width:8, height:8, borderRadius:"50%", background:"#fff", boxShadow:"0 0 6px rgba(255,255,255,.9)" }}/>
            )}
          </motion.button>
        </div>
      </motion.nav>

      <NavMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* Top padding spacer */}
      <div style={{ height: 64 }} />
    </>
  );
}
