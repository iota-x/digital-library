"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserData, displayName, partnerDisplayName, updateSettings, getUser } from "@/lib/userStore";
import { onSSE } from "@/lib/sseClient";
import { TRUTHS, DARES, TRUTHS_18, DARES_18, pickFresh } from "@/lib/playDecks";
import { SERIF, SANS, SCRIPT } from "@/lib/typography";
import { buzz } from "@/lib/haptics";

const CARD: React.CSSProperties = {
  background: "var(--cream)",
  border: "1.5px solid rgba(var(--pink-rgb), .35)",
  borderRadius: 20,
  padding: "clamp(1.3rem, 4vw, 1.9rem)",
  boxShadow: "0 12px 40px rgba(var(--pink-deep-rgb), .1)",
};

export default function TruthOrDare() {
  const user = useUserData();
  const [kind, setKind] = useState<"truth" | "dare" | null>(null);
  const [text, setText] = useState("");
  const [turn, setTurn] = useState(0); // 0 = you, 1 = partner
  // Spicy mode mixes the explicit 18+ cards into the decks. It's a couple-level
  // setting (shared & synced via the couple's `settings`), so flipping it on one
  // phone flips it on both — off by default.
  const spicy = user?.settings?.spicyMode === true;
  // Track recently-drawn cards per pool so the same one doesn't come back around
  // again so soon (it gets weird seeing it again two cards later).
  const recentTruths = useRef<string[]>([]);
  const recentDares = useRef<string[]>([]);

  // Live-sync: when the partner toggles spicy mode, reflect it here instantly.
  useEffect(() => {
    return onSSE((detail) => {
      if (detail.type !== "settings:spicy") return;
      const me = getUser();
      if (me) updateSettings({ ...me.settings, spicyMode: detail.on === true });
    });
  }, []);

  const setSpicy = (next: boolean) => {
    const me = getUser();
    if (me) updateSettings({ ...me.settings, spicyMode: next }); // optimistic
    fetch("/api/couples/spicy", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ on: next }),
    }).catch(() => {});
  };

  const toggleSpicy = () => {
    if (!spicy) {
      const ok = window.confirm(
        "Spicy mode adds explicit 18+ cards (including consensual power-play) to truth or dare.\n\nIt turns on for BOTH of you. Only enable it if you're both adults and good with it. Continue?",
      );
      if (!ok) return;
    }
    setSpicy(!spicy);
    buzz("tap");
  };

  const names = [displayName(user) || "you", partnerDisplayName(user) || "them"];

  const draw = (k: "truth" | "dare") => {
    buzz(k === "dare" ? "double" : "tap");
    // Spicy mode = ONLY the explicit deck — no soft/silly cards mixed in.
    const pool = spicy
      ? (k === "truth" ? TRUTHS_18 : DARES_18)
      : (k === "truth" ? TRUTHS : DARES);
    const recentRef = k === "truth" ? recentTruths : recentDares;
    const { pick, recent } = pickFresh(pool, recentRef.current);
    recentRef.current = recent;
    setKind(k);
    setText(pick);
    setTurn((t) => (t + 1) % 2);
  };

  return (
    <div style={{ width: "100%", maxWidth: 640, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
        <div style={{ fontSize: "1.6rem" }}>🎲</div>
        <h2 style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, fontSize: "clamp(1.4rem,4vw,1.8rem)", color: "var(--pink-deep)", margin: "0.1rem 0 0.2rem" }}>
          truth or dare
        </h2>
        <p style={{ fontFamily: SCRIPT, fontSize: "1rem", color: "var(--muted)", margin: 0 }}>
          {spicy ? "take turns — reignite the spark, miles apart 🔞" : "take turns — soft, silly, just for you two"}
        </p>
        <div style={{ marginTop: "0.7rem" }}>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={toggleSpicy}
            aria-pressed={spicy}
            style={{
              fontFamily: SANS, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.04em",
              cursor: "pointer", borderRadius: 50, padding: "0.4rem 0.95rem",
              border: `1.5px solid ${spicy ? "#be123c" : "rgba(var(--pink-rgb), .45)"}`,
              background: spicy ? "linear-gradient(135deg,#fb7185,#be123c)" : "transparent",
              color: spicy ? "#fff" : "var(--pink-deep)",
              boxShadow: spicy ? "0 6px 18px rgba(190,18,60,.3)" : "none",
            }}
          >
            {spicy ? "spicy mode: on 🔞" : "spicy mode: off 🌶️"}
          </motion.button>
        </div>
      </div>

      <div style={CARD}>
        <p style={{ fontFamily: SANS, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(var(--pink-deep-rgb), .5)", textAlign: "center", margin: "0 0 0.8rem" }}>
          {names[turn]}&apos;s turn
        </p>

        <AnimatePresence mode="wait">
          {text ? (
            <motion.div key={text} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}
              style={{ textAlign: "center", padding: "0.5rem 0 1rem" }}>
              <span style={{ display: "inline-block", fontFamily: SANS, fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: kind === "dare" ? "#be123c" : "var(--pink-deep)", marginBottom: "0.6rem" }}>
                {kind}
              </span>
              <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "clamp(1.2rem,4vw,1.6rem)", color: "var(--text)", margin: 0, lineHeight: 1.4 }}>
                {text}
              </p>
            </motion.div>
          ) : (
            <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ fontFamily: SCRIPT, fontSize: "1.1rem", color: "var(--muted)", textAlign: "center", padding: "0.8rem 0 1.2rem", margin: 0 }}>
              pick one to begin 💞
            </motion.p>
          )}
        </AnimatePresence>

        <div style={{ display: "flex", gap: "0.6rem", justifyContent: "center" }}>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => draw("truth")} style={pillBtn(false)}>truth 💭</motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => draw("dare")} style={pillBtn(true)}>dare 🔥</motion.button>
        </div>
      </div>
    </div>
  );
}

function pillBtn(dare: boolean): React.CSSProperties {
  return {
    fontFamily: SANS, fontSize: "0.95rem", fontWeight: 700, border: "none", borderRadius: 50,
    padding: "0.7rem 1.7rem", cursor: "pointer", color: "#fff",
    background: dare ? "linear-gradient(135deg,#fb7185,#be123c)" : "linear-gradient(135deg, var(--pink), var(--pink-deep))",
    boxShadow: "0 6px 20px rgba(var(--pink-deep-rgb), .3)",
  };
}
