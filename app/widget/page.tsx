"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { fetchUserData, useUserData, displayName, partnerDisplayName } from "@/lib/userStore";
import { daysTogether } from "@/lib/relationship";
import { SERIF, SANS } from "@/lib/typography";

/**
 * Glanceable "days together" view — the PWA stand-in for a home-screen
 * widget. Linked from a manifest shortcut (long-press the app icon) and kept
 * intentionally lightweight: no password gate, just the count. Uses the
 * couple's start date once hydrated, the global default before that.
 */
export default function WidgetPage() {
  const user = useUserData();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => { fetchUserData(); }, []);
  // Tick once a minute so the count rolls over if left open past midnight.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const days = daysTogether(user?.startDate);
  const names = [displayName(user), partnerDisplayName(user)].filter(Boolean).join(" & ");

  return (
    <main
      key={now}
      style={{
        minHeight: "100dvh", width: "100%",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: "0.5rem", padding: "2rem",
        background: "radial-gradient(circle at 50% 35%, rgba(var(--pink-rgb),.12), var(--cream) 70%)",
        textAlign: "center",
      }}
    >
      <motion.span
        initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        className="occ-heart"
        style={{ fontSize: "2.4rem", lineHeight: 1, marginBottom: "0.5rem" }}
      >
        💗
      </motion.span>

      <motion.div
        initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 180, damping: 20 }}
        style={{
          fontFamily: SERIF, fontWeight: 700,
          fontSize: "clamp(5rem, 28vw, 12rem)", lineHeight: 0.95,
          color: "var(--pink-deep)",
          textShadow: "0 0 50px rgba(var(--pink-rgb),.4)",
        }}
        aria-label={`${days} days together`}
      >
        {days.toLocaleString()}
      </motion.div>

      <span style={{ fontFamily: SANS, fontSize: "0.9rem", letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--muted)" }}>
        days together
      </span>

      {names && (
        <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "1.1rem", color: "var(--pink-deep)", marginTop: "0.8rem" }}>
          {names}
        </span>
      )}

      <Link
        href="/"
        style={{ marginTop: "2.5rem", fontFamily: SANS, fontSize: "0.8rem", color: "var(--muted)", textDecoration: "none", borderBottom: "1px solid rgba(var(--pink-rgb),.3)", paddingBottom: "0.1rem" }}
      >
        open us →
      </Link>
    </main>
  );
}
