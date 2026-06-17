"use client";
import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";
import { SCRIPT } from "@/lib/typography";

/**
 * A little hand-written speech-bubble label that pops next to a control on
 * hover/focus. Meant to live INSIDE a positioned (fixed/relative) trigger —
 * it's absolutely positioned against it and never intercepts pointer events.
 *
 * Positioning (incl. the centering translate) lives on a static outer span so
 * it never fights framer's animated transform on the inner span.
 */
type Placement = "top" | "left" | "right";

const PLACEMENT: Record<Placement, React.CSSProperties> = {
  top:   { bottom: "calc(100% + 0.7rem)", left: "50%", transform: "translateX(-50%)" },
  left:  { right:  "calc(100% + 0.7rem)", top: "50%", transform: "translateY(-50%)" },
  right: { left:   "calc(100% + 0.7rem)", top: "50%", transform: "translateY(-50%)" },
};

// Pop the bubble out from the side nearest the trigger.
const ORIGIN: Record<Placement, string> = { top: "bottom center", left: "right center", right: "left center" };

export default function CuteTooltip({
  show, label, placement = "top",
}: { show: boolean; label: ReactNode; placement?: Placement }) {
  const tail: React.CSSProperties =
    placement === "right" ? { left: -3, top: "50%", transform: "translateY(-50%) rotate(45deg)" }
    : placement === "left" ? { right: -3, top: "50%", transform: "translateY(-50%) rotate(45deg)" }
    : { bottom: -3, left: "50%", transform: "translateX(-50%) rotate(45deg)" };

  return (
    <span style={{ position: "absolute", zIndex: 50, pointerEvents: "none", ...PLACEMENT[placement] }}>
      <AnimatePresence>
        {show && (
          <motion.span
            aria-hidden
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ type: "spring", stiffness: 460, damping: 22 }}
            style={{
              display: "block", position: "relative",
              transformOrigin: ORIGIN[placement],
              whiteSpace: "nowrap",
              background: "var(--cream)",
              color: "var(--pink-deep)",
              fontFamily: SCRIPT, fontSize: "1rem", lineHeight: 1.1,
              padding: "0.4rem 0.8rem", borderRadius: 14,
              border: "1.5px solid var(--pink-mid)",
              boxShadow: "0 8px 24px rgba(var(--pink-deep-rgb), .25)",
            }}
          >
            {label}
            <span style={{
              position: "absolute", width: 9, height: 9,
              background: "var(--cream)",
              borderLeft: "1.5px solid var(--pink-mid)",
              borderBottom: "1.5px solid var(--pink-mid)",
              ...tail,
            }} />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
