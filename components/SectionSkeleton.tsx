"use client";
import { motion } from "framer-motion";

interface SkeletonProps {
  bg?: string;
  accent?: string;
  lines?: number;
  showHeader?: boolean;
}

export default function SectionSkeleton({
  bg = "linear-gradient(160deg,var(--cream) 0%,var(--pink-mid) 50%,var(--cream) 100%)",
  accent = "rgba(var(--pink-deep-rgb),0.3)",
  lines = 4,
  showHeader = true,
}: SkeletonProps) {
  const shimmer = {
    animate: { opacity: [0.3, 0.7, 0.3] },
    transition: { repeat: Infinity, duration: 1.6, ease: "easeInOut" as const },
  };

  return (
    <section style={{
      position: "relative", width: "100%", minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "clamp(4rem,8vh,7rem) clamp(1rem,4vw,3rem)",
      background: bg, overflow: "hidden",
    }}>
      <div style={{ maxWidth: 560, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>
        {showHeader && (
          <>
            {/* Decorative line */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", width: "100%" }}>
              <motion.div {...shimmer} style={{ flex: 1, height: 1, background: accent, borderRadius: 1 }} />
              <motion.div {...shimmer} style={{ width: 24, height: 24, borderRadius: "50%", background: accent }} />
              <motion.div {...shimmer} style={{ flex: 1, height: 1, background: accent, borderRadius: 1 }} />
            </div>
            {/* Title */}
            <motion.div {...shimmer} style={{ width: "55%", height: 36, borderRadius: 8, background: accent }} />
            {/* Subtitle */}
            <motion.div {...shimmer} style={{ width: "70%", height: 16, borderRadius: 6, background: `${accent.replace("0.3","0.15")}` }} />
          </>
        )}
        {/* Content lines */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.8rem", marginTop: "1rem" }}>
          {Array.from({ length: lines }, (_, i) => (
            <motion.div key={i}
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut", delay: i * 0.12 }}
              style={{
                width: i % 3 === 2 ? "65%" : i % 3 === 1 ? "85%" : "100%",
                height: i === 0 ? 120 : 14,
                borderRadius: i === 0 ? 16 : 6,
                background: accent,
                alignSelf: i === 0 ? "center" : "stretch",
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}