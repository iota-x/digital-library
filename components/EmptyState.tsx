"use client";
import { motion } from "framer-motion";
import { SERIF, SANS } from "@/lib/typography";


interface Props {
  /** Big emoji shown at the top. */
  emoji: string;
  /** Headline — what's empty. */
  title: string;
  /** One-line subtitle nudging the user to take action. */
  hint?: string;
  /** Primary CTA. */
  action?: { label: string; onClick: () => void };
  /** Visual size — "section" fills a tall section, "inline" is compact. */
  size?: "section" | "inline";
}

export default function EmptyState({ emoji, title, hint, action, size = "section" }: Props) {
  const isInline = size === "inline";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        textAlign: "center",
        padding: isInline ? "2rem 1rem" : "3.5rem 1.5rem",
        maxWidth: 380, margin: "0 auto",
      }}
    >
      <div style={{ fontSize: isInline ? "2.4rem" : "3.2rem", marginBottom: "0.7rem", opacity: 0.65 }}>
        {emoji}
      </div>
      <h3 style={{
        fontFamily: SERIF, fontStyle: "italic", color: "var(--pink-deep)",
        fontSize: isInline ? "clamp(1.05rem,2.5vw,1.25rem)" : "clamp(1.2rem,3vw,1.55rem)",
        margin: "0 0 0.5rem", fontWeight: 400,
      }}>
        {title}
      </h3>
      {hint && (
        <p style={{ fontFamily: SANS, fontSize: "0.85rem", color: "var(--muted)", margin: "0 0 1.5rem", lineHeight: 1.55 }}>
          {hint}
        </p>
      )}
      {action && (
        <motion.button
          onClick={action.onClick}
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.97 }}
          style={{
            fontFamily: SANS, fontSize: "0.9rem", fontWeight: 700,
            background: "linear-gradient(135deg,var(--pink),var(--pink-deep))",
            color: "#fff", border: "none",
            borderRadius: 50, padding: "0.7rem 1.6rem",
            cursor: "pointer",
            boxShadow: "0 6px 22px rgba(var(--pink-deep-rgb),.3)",
          }}
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
}
