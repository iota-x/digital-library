"use client";
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserData } from "@/lib/userStore";
import { buzz } from "@/lib/haptics";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { SANS } from "@/lib/typography";

const PALETTE = ["🩷", "🥺", "✨", "🌷", "😘", "🥰", "👀", "💌"] as const;

/**
 * Soft reaction pills for a journal entry.
 *
 * - Each emoji that already has at least one reactor renders as a pill with
 *   a count. Tapping toggles your reaction.
 * - A "+" pill opens the picker.
 * - All state lives upstream — this component only emits `onToggle(emoji)`.
 *   That keeps it embeddable in DayView, OnThisDay, the lightbox caption,
 *   anywhere a memory is shown.
 */
export default function ReactionPills({
  reactions,
  onToggle,
  align = "start",
}: {
  reactions: Record<string, string[]> | undefined;
  onToggle: (emoji: string) => Promise<void> | void;
  align?: "start" | "center" | "end";
}) {
  const userData = useUserData();
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const data = reactions ?? {};
  const myId = userData?.userId || "";

  // Trap focus inside the emoji picker while it's open; Esc closes it.
  const pickerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(pickerRef, { active: picking, onEscape: () => setPicking(false) });

  const handle = async (emoji: string) => {
    if (busy) return;
    setBusy(emoji);
    buzz("tap");
    try { await onToggle(emoji); } finally { setBusy(null); setPicking(false); }
  };

  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: "0.35rem",
      justifyContent: align === "center" ? "center" : align === "end" ? "flex-end" : "flex-start",
      alignItems: "center",
    }}>
      {Object.entries(data).map(([emoji, userIds]) => {
        if (!userIds || userIds.length === 0) return null;
        const mine = Boolean(myId && userIds.includes(myId));
        return (
          <motion.button
            key={emoji}
            onClick={() => handle(emoji)}
            whileTap={{ scale: 0.9 }}
            aria-label={mine ? `remove your ${emoji} reaction` : `react ${emoji}`}
            aria-pressed={mine}
            style={{
              display: "flex", alignItems: "center", gap: "0.3rem",
              padding: "0.22rem 0.55rem",
              borderRadius: 50,
              background: mine ? "rgba(var(--pink-deep-rgb), .2)" : "rgba(var(--pink-rgb), .08)",
              border: `1px solid ${mine ? "rgba(var(--pink-deep-rgb), .55)" : "rgba(var(--pink-rgb), .25)"}`,
              cursor: "pointer", color: "var(--text)",
              fontFamily: SANS, fontSize: "0.78rem",
              opacity: busy && busy !== emoji ? 0.5 : 1,
            }}
          >
            <span aria-hidden style={{ fontSize: "0.9rem", lineHeight: 1 }}>{emoji}</span>
            <span style={{ fontWeight: 700, color: "var(--pink-deep)" }}>{userIds.length}</span>
          </motion.button>
        );
      })}

      <div style={{ position: "relative" }}>
        <motion.button
          onClick={() => setPicking(p => !p)}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.92 }}
          aria-label="add a reaction"
          aria-expanded={picking}
          style={{
            display: "flex", alignItems: "center", gap: "0.28rem",
            padding: "0.24rem 0.6rem 0.24rem 0.5rem",
            borderRadius: 50,
            background: picking ? "rgba(var(--pink-deep-rgb), .14)" : "rgba(var(--pink-rgb), .08)",
            border: `1px solid rgba(var(--pink-rgb), ${picking ? ".5" : ".28"})`,
            cursor: "pointer", color: "var(--pink-deep)",
            fontFamily: SANS, fontSize: "0.76rem", fontWeight: 600,
            transition: "background .18s, border-color .18s",
          }}
        >
          <span aria-hidden style={{ fontSize: "0.95rem", lineHeight: 1 }}>🙂</span>
          react
        </motion.button>

        <AnimatePresence>
          {picking && (
            <motion.div
              ref={pickerRef}
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              role="dialog" aria-modal="true" aria-label="pick a reaction"
              style={{
                position: "absolute", top: "calc(100% + 0.5rem)",
                right: 0, zIndex: 30,
                background: "rgba(var(--pink-light-rgb,253,242,248), .82)",
                backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(var(--pink-rgb), .3)",
                borderRadius: 999,
                padding: "0.3rem 0.4rem",
                boxShadow: "0 12px 34px rgba(var(--pink-deep-rgb), .22), 0 2px 6px rgba(var(--pink-deep-rgb), .12)",
                display: "flex", flexWrap: "nowrap", gap: "0.1rem",
                maxWidth: "92vw",
              }}
            >
              {PALETTE.map((emoji, i) => (
                <motion.button
                  key={emoji}
                  onClick={() => handle(emoji)}
                  aria-label={`react ${emoji}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.02 * i, type: "spring", stiffness: 400, damping: 24 }}
                  whileHover={{ scale: 1.32, y: -3 }}
                  whileTap={{ scale: 0.85 }}
                  style={{
                    background: "transparent", border: "none", cursor: "pointer",
                    width: 38, height: 38, borderRadius: "50%",
                    fontSize: "1.35rem", lineHeight: 1, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transformOrigin: "center bottom",
                  }}
                >
                  {emoji}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
