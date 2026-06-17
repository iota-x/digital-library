"use client";
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications } from "@/lib/notificationStore";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { SERIF, SANS } from "@/lib/typography";

/** Relative "2m ago" / "3h ago" / "Jun 14" timestamp. */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const { items, unreadCount, markAllRead, clear } = useNotifications();
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, { active: open, onEscape: () => setOpen(false) });

  const toggle = () => {
    setOpen(o => {
      const next = !o;
      // Opening the bell is the "I looked" signal — clear the unread count.
      if (next && unreadCount > 0) markAllRead();
      return next;
    });
  };

  return (
    <div style={{ position: "relative" }}>
      <motion.button
        onClick={toggle}
        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
        aria-label={unreadCount > 0 ? `notifications, ${unreadCount} unread` : "notifications"}
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{
          position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 34, height: 34, borderRadius: "50%",
          background: "rgba(var(--pink-light-rgb,252,231,243),.55)",
          border: "1px solid rgba(var(--pink-mid-rgb,249,168,212),.35)",
          cursor: "pointer", fontSize: "1rem",
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span
            aria-hidden
            style={{
              position: "absolute", top: -3, right: -3, minWidth: 16, height: 16,
              padding: "0 4px", borderRadius: 8,
              background: "linear-gradient(135deg,var(--pink),var(--pink-deep))",
              color: "#fff", fontFamily: SANS, fontSize: "0.6rem", fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 6px rgba(var(--pink-deep-rgb),.5)",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            {/* Click-away backdrop */}
            <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 9100 }} />
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Notifications — what's new"
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: "absolute", top: "calc(100% + 10px)", right: 0, zIndex: 9101,
                width: "min(340px, 90vw)", maxHeight: "70vh",
                background: "var(--cream)",
                border: "1.5px solid rgba(var(--pink-mid-rgb,249,168,212),.4)",
                borderRadius: 18, overflow: "hidden",
                display: "flex", flexDirection: "column",
                boxShadow: "0 24px 70px rgba(var(--pink-deep-rgb),.25)",
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.9rem 1.1rem", borderBottom: "1px solid rgba(var(--pink-mid-rgb,249,168,212),.3)" }}>
                <h3 style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "1.05rem", color: "var(--pink-deep)", margin: 0 }}>what&apos;s new</h3>
                {items.length > 0 && (
                  <button onClick={clear} style={{ fontFamily: SANS, fontSize: "0.7rem", color: "var(--muted)", background: "none", border: "none", cursor: "pointer", padding: "0.2rem 0.3rem" }}>
                    clear all
                  </button>
                )}
              </div>

              {/* List */}
              <div style={{ overflowY: "auto", flex: 1 }}>
                {items.length === 0 ? (
                  <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.92rem", color: "var(--muted)", textAlign: "center", padding: "2rem 1rem", margin: 0 }}>
                    all caught up 🌸
                  </p>
                ) : (
                  items.map(n => (
                    <a
                      key={n.id + n.at}
                      href={n.href || undefined}
                      onClick={() => setOpen(false)}
                      style={{
                        display: "flex", gap: "0.7rem", alignItems: "flex-start",
                        padding: "0.8rem 1.1rem",
                        borderBottom: "1px solid rgba(var(--pink-mid-rgb,249,168,212),.18)",
                        textDecoration: "none", cursor: n.href ? "pointer" : "default",
                      }}
                    >
                      <span style={{ fontSize: "1.25rem", lineHeight: 1.2, flexShrink: 0 }}>{n.emoji}</span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontFamily: SANS, fontSize: "0.82rem", fontWeight: 600, color: "var(--text)" }}>{n.title}</div>
                        <div style={{ fontFamily: SANS, fontSize: "0.76rem", color: "var(--muted)", lineHeight: 1.35 }}>{n.message}</div>
                        <div style={{ fontFamily: SANS, fontSize: "0.66rem", color: "var(--muted)", opacity: 0.7, marginTop: "0.15rem" }}>{timeAgo(n.at)}</div>
                      </div>
                    </a>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
