"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SERIF = `"Georgia","Times New Roman",serif`;
const SANS  = `var(--font-lato),"Inter",system-ui,sans-serif`;
const MONO  = `"Courier New",Courier,monospace`;

interface Shortcut { keys: string[]; label: string; mobile?: string }

const SHORTCUTS: { group: string; items: Shortcut[] }[] = [
  { group: "navigation", items: [
    { keys: ["⌘", "K"],     label: "search anything (also Ctrl+K)" },
    { keys: ["←", "→"],    label: "swipe between pages",            mobile: "swipe left / right" },
    { keys: ["g", "j"],    label: "go to journal" },
    { keys: ["g", "h"],    label: "go to home" },
    { keys: ["g", "s"],    label: "go to shared" },
    { keys: ["g", "c"],    label: "go to capsule" },
    { keys: ["g", "m"],    label: "go to memories" },
  ]},
  { group: "calendar", items: [
    { keys: ["←", "→"],    label: "previous / next month",          mobile: "swipe left / right" },
    { keys: ["t"],          label: "jump to today" },
    { keys: ["Enter"],      label: "open selected day" },
  ]},
  { group: "general", items: [
    { keys: ["?"],          label: "open this cheatsheet" },
    { keys: ["Esc"],        label: "close any dialog / modal" },
  ]},
];

export default function ShortcutSheet() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement | null)?.isContentEditable;
      if (e.key === "?" && !isTyping) {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 9980, background: "rgba(0,0,0,.55)", backdropFilter: "blur(6px)" }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            role="dialog" aria-label="keyboard shortcuts"
            style={{
              position: "fixed", zIndex: 9981,
              top: "50%", left: "50%", transform: "translate(-50%, -50%)",
              width: "min(520px, 94vw)", maxHeight: "82dvh", overflowY: "auto",
              background: "var(--cream)",
              border: "1.5px solid var(--pink-mid)",
              borderRadius: 22,
              padding: "1.6rem",
              boxShadow: "0 32px 80px rgba(var(--pink-deep-rgb),.25)",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h2 style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "1.4rem", color: "var(--pink-deep)", margin: 0, fontWeight: 400 }}>
                shortcuts 🎀
              </h2>
              <button onClick={() => setOpen(false)} aria-label="close"
                style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "1rem" }}>✕</button>
            </div>
            {SHORTCUTS.map(g => (
              <div key={g.group} style={{ marginBottom: "1.1rem" }}>
                <p style={{ fontFamily: SANS, fontSize: "0.65rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--muted)", margin: "0 0 0.6rem", fontWeight: 700 }}>
                  {g.group}
                </p>
                {g.items.map((s, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem",
                    padding: "0.45rem 0", borderBottom: "1px dashed rgba(var(--pink-rgb),.18)",
                  }}>
                    <span style={{ fontFamily: SANS, fontSize: "0.85rem", color: "var(--text)", flex: 1, minWidth: 0 }}>
                      {s.label}
                      {s.mobile && (
                        <span style={{ fontSize: "0.7rem", color: "var(--muted)", marginLeft: "0.5rem" }}>
                          · mobile: {s.mobile}
                        </span>
                      )}
                    </span>
                    <span style={{ display: "flex", gap: "0.25rem", flexShrink: 0 }}>
                      {s.keys.map((k, j) => (
                        <kbd key={j} style={{
                          fontFamily: MONO, fontSize: "0.72rem",
                          background: "rgba(var(--pink-rgb),.15)",
                          border: "1px solid rgba(var(--pink-rgb),.4)",
                          color: "var(--pink-deep)", fontWeight: 700,
                          padding: "0.18rem 0.5rem", borderRadius: 6, minWidth: 22, textAlign: "center" as const,
                        }}>{k}</kbd>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            ))}
            <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: "var(--muted)", textAlign: "center", margin: "0.5rem 0 0" }}>
              press <kbd style={{ fontFamily: MONO, fontSize: "0.7rem", padding: "0.05rem 0.35rem", border: "1px solid var(--pink-mid)", borderRadius: 4 }}>?</kbd> anywhere to open this
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
