"use client";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Lightweight ambient background for otherwise-flat sections.
 *  - Soft blurred gradient orbs that breathe, plus a few gentle sparkles
 *  - Theme-aware (pure CSS vars), GPU-friendly (transform/opacity only)
 *  - Honors prefers-reduced-motion, never intercepts pointer events
 *
 * Drop as the first child of a `position: relative; overflow: hidden` section,
 * then give the real content `position: relative; zIndex: 1` so it sits above.
 */

type Orb = { x: string; y: string; size: number; color: string };

const VARIANTS: Record<string, Orb[]> = {
  a: [
    { x: "-6%", y: "6%",  size: 340, color: "rgba(var(--pink-rgb),.20)" },
    { x: "80%", y: "-4%", size: 280, color: "rgba(var(--pink-deep-rgb),.12)" },
    { x: "58%", y: "68%", size: 320, color: "rgba(var(--pink-deep-rgb),.10)" },
  ],
  b: [
    { x: "78%", y: "4%",  size: 320, color: "rgba(var(--pink-rgb),.18)" },
    { x: "-8%", y: "52%", size: 300, color: "rgba(var(--pink-deep-rgb),.12)" },
    { x: "38%", y: "82%", size: 260, color: "rgba(var(--pink-deep-rgb),.10)" },
  ],
  c: [
    { x: "-5%", y: "58%", size: 340, color: "rgba(var(--pink-rgb),.18)" },
    { x: "70%", y: "-8%", size: 300, color: "rgba(var(--pink-deep-rgb),.12)" },
    { x: "86%", y: "60%", size: 260, color: "rgba(var(--pink-deep-rgb),.12)" },
  ],
};

const SPARKLES = ["✦", "✧", "🌸", "✦"];

export default function SectionGlow({
  variant = "a",
  sparkles = true,
}: { variant?: "a" | "b" | "c"; sparkles?: boolean }) {
  const reduced = useReducedMotion();
  const orbs = VARIANTS[variant] ?? VARIANTS.a;

  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      {orbs.map((o, i) => (
        <motion.div
          key={`o${i}`}
          animate={reduced ? undefined : { scale: [1, 1.14, 1], opacity: [0.55, 0.85, 0.55] }}
          transition={{ duration: 8 + i * 2, repeat: Infinity, ease: "easeInOut", delay: i * 1.4 }}
          style={{
            position: "absolute", left: o.x, top: o.y,
            width: o.size, height: o.size, borderRadius: "50%",
            background: o.color, filter: "blur(60px)", willChange: "transform, opacity",
          }}
        />
      ))}
      {sparkles && !reduced && SPARKLES.map((s, i) => (
        <motion.span
          key={`s${i}`}
          animate={{ opacity: [0, 0.7, 0], scale: [0.6, 1, 0.6], y: [0, -10, 0] }}
          transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut", delay: i * 1.3 }}
          style={{
            position: "absolute",
            left: `${12 + i * 23}%`, top: `${16 + (i % 2) * 56}%`,
            fontSize: 12 + (i % 2) * 6, color: "var(--pink)",
            filter: "drop-shadow(0 0 5px rgba(var(--pink-rgb),.6))",
          }}
        >
          {s}
        </motion.span>
      ))}
    </div>
  );
}
