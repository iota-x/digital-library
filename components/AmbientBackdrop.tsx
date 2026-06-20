"use client";
import { motion } from "framer-motion";

/**
 * Subtle, cute ambient layer for pages that otherwise have a flat background:
 * a few soft breathing orbs + slow-drifting tiny hearts/sparkles, all in the
 * couple's theme colour and kept low-opacity so it never competes with content.
 *
 * Renders at `z-index: -1` and is `position: fixed`, so the parent must create
 * a stacking context (`position: relative; isolation: isolate`) — then this
 * paints above the parent's background but below its content. The `.flow-page`
 * rule already sets that up; non-flow pages should isolate their <main>.
 *
 * Respects reduced-motion via framer's MotionConfig (set app-wide in MotionRoot).
 */

const ORBS = [
  { l: "8%",  t: "14%", s: 320, c: "rgba(var(--pink-rgb),0.14)",            d: 9 },
  { l: "80%", t: "26%", s: 280, c: "rgba(var(--pink-deep-rgb),0.11)",       d: 11 },
  { l: "62%", t: "78%", s: 340, c: "rgba(var(--pink-rgb),0.12)",            d: 10 },
  { l: "12%", t: "70%", s: 260, c: "rgba(var(--pink-mid-rgb,249,168,212),0.12)", d: 12 },
];

const HEARTS = ["💗","🩷","✨","💕","🌸","💞","🩷","✨","💗","🌷","💕","🌸"];

export default function AmbientBackdrop() {
  return (
    <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: -1, overflow: "hidden", pointerEvents: "none" }}>
      {ORBS.map((o, i) => (
        <motion.div key={`o${i}`}
          animate={{ scale: [1, 1.16, 1], opacity: [0.5, 0.85, 0.5] }}
          transition={{ repeat: Infinity, duration: o.d, delay: i * 1.1, ease: "easeInOut" }}
          style={{ position: "absolute", left: o.l, top: o.t, width: o.s, height: o.s, borderRadius: "50%", background: o.c, filter: "blur(62px)" }}
        />
      ))}
      {HEARTS.map((h, i) => (
        <motion.span key={`h${i}`}
          initial={{ y: "110vh", opacity: 0 }}
          animate={{ y: "-12vh", opacity: [0, 0.32, 0] }}
          transition={{ repeat: Infinity, duration: 16 + (i % 5) * 4, delay: i * 1.7, ease: "linear" }}
          style={{ position: "absolute", left: `${(i * 8.3 + 4) % 100}%`, fontSize: `${13 + (i % 3) * 6}px`, filter: "saturate(0.85)" }}
        >
          {h}
        </motion.span>
      ))}
    </div>
  );
}
