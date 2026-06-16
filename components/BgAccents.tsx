"use client";
import { useEffect, useState, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

type Variant = "embers" | "stardust" | "papers";

interface Props {
  variant: Variant;
  /** Count on desktop (≥640px). Default 10. */
  desktopCount?: number;
  /** Count on mobile (<640px). Default 5. */
  mobileCount?: number;
}

/* Deterministic pseudo-random per index so the layout is stable across
   renders (no hydration mismatch, no jitter on theme switch). */
function rand(i: number, salt: number) {
  const v = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return Math.abs(v - Math.floor(v));
}

/**
 * Lightweight theme-aware background motion.
 *  - Pure CSS variables for color — auto-adapts to active theme + dark mode
 *  - Uses transform/opacity only (GPU-accelerated)
 *  - Honors `prefers-reduced-motion`
 *  - Drops particle count on small screens
 *  - Renders nothing on the server (avoids SSR mismatch w/ window check)
 */
export default function BgAccents({
  variant,
  desktopCount = 10,
  mobileCount  = 5,
}: Props) {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const apply = () => setCount(window.innerWidth < 640 ? mobileCount : desktopCount);
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [mobileCount, desktopCount]);

  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      left:     rand(i, 1) * 100,
      top:      rand(i, 6) * 100,
      delay:    rand(i, 2) * 8,
      duration: 6 + rand(i, 3) * 6,
      size:     0.7 + rand(i, 4) * 1.6,
      drift:    rand(i, 5) * 40 - 20,
    })),
  [count]);

  if (reduced || count === 0) return null;

  if (variant === "embers") {
    return (
      <>
        {particles.map((p, i) => (
          <motion.span
            key={i}
            initial={{ y: 0, x: 0, opacity: 0 }}
            animate={{
              y: ["0vh", "-110vh"],
              x: [0, p.drift, -p.drift, 0],
              opacity: [0, 0.7, 0.7, 0],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "easeOut",
            }}
            style={{
              position: "absolute",
              left: `${p.left}%`,
              bottom: 0,
              width:  6 * p.size,
              height: 6 * p.size,
              borderRadius: "50%",
              background: "var(--pink-deep)",
              boxShadow:  "0 0 10px rgba(var(--pink-rgb), .85)",
              willChange: "transform, opacity",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
        ))}
      </>
    );
  }

  if (variant === "stardust") {
    return (
      <>
        {particles.map((p, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
              opacity: [0, 0.85, 0],
              scale:   [0.5, 1.2, 0.5],
              y:       [0, -16, 0],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              position: "absolute",
              left: `${p.left}%`,
              top:  `${p.top}%`,
              fontSize: 8 + 8 * p.size,
              lineHeight: 1,
              color: "var(--pink)",
              filter: "drop-shadow(0 0 4px rgba(var(--pink-rgb), .6))",
              willChange: "transform, opacity",
              pointerEvents: "none",
              userSelect: "none",
              zIndex: 0,
            }}
          >
            ✦
          </motion.span>
        ))}
      </>
    );
  }

  // "papers" — drifting page rectangles
  return (
    <>
      {particles.map((p, i) => (
        <motion.span
          key={i}
          initial={{ y: "110vh", rotate: 0, opacity: 0 }}
          animate={{
            y:       ["110vh", "-20vh"],
            rotate:  [0, 200 + p.drift],
            opacity: [0, 0.22, 0.22, 0],
          }}
          transition={{
            duration: p.duration + 6,
            delay: p.delay,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            width:  22 + 18 * p.size,
            height: 28 + 22 * p.size,
            borderRadius: 3,
            background: "var(--cream)",
            border:  "1px solid rgba(var(--pink-rgb), .35)",
            boxShadow: "0 4px 14px rgba(var(--pink-deep-rgb), .14)",
            willChange: "transform, opacity",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      ))}
    </>
  );
}
