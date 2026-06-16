"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserData } from "@/lib/userStore";
import { buzz } from "@/lib/haptics";
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
          whileTap={{ scale: 0.9 }}
          aria-label="add a reaction"
          aria-expanded={picking}
          style={{
            padding: "0.22rem 0.6rem",
            borderRadius: 50,
            background: "transparent",
            border: "1px dashed rgba(var(--pink-deep-rgb), .35)",
            cursor: "pointer", color: "var(--pink-deep)",
            fontFamily: SANS, fontSize: "0.78rem", fontWeight: 700,
          }}
        >
          + react
        </motion.button>

        <AnimatePresence>
          {picking && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              role="dialog" aria-label="pick a reaction"
              style={{
                position: "absolute", top: "calc(100% + 0.4rem)",
                right: 0, zIndex: 30,
                background: "var(--cream)",
                border: "1px solid rgba(var(--pink-rgb), .35)",
                borderRadius: 14,
                padding: "0.35rem",
                boxShadow: "0 16px 40px rgba(var(--pink-deep-rgb), .25)",
                display: "flex", flexWrap: "wrap", gap: "0.15rem",
                maxWidth: 220,
              }}
            >
              {PALETTE.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handle(emoji)}
                  aria-label={`react ${emoji}`}
                  style={{
                    background: "transparent", border: "none", cursor: "pointer",
                    width: 36, height: 36, borderRadius: 8,
                    fontSize: "1.2rem", lineHeight: 1,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(var(--pink-rgb), .15)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
