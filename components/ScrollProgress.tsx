"use client";
import { motion, useScroll, useSpring } from "framer-motion";

/**
 * A thin themed bar pinned to the very top that fills as you scroll the page —
 * a small "you're moving through something" cue that makes long, scrolly pages
 * feel intentional rather than endless. Spring-smoothed so it glides instead of
 * snapping with the scroll wheel.
 */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });

  return (
    <motion.div
      aria-hidden
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        height: 3,
        transformOrigin: "0% 50%",
        scaleX,
        background: "linear-gradient(90deg, var(--pink), var(--pink-deep))",
        boxShadow: "0 1px 10px rgba(var(--pink-deep-rgb), .55)",
        zIndex: 950,
        pointerEvents: "none",
      }}
    />
  );
}
