"use client";
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WOULD_YOU_RATHER, type Dilemma } from "@/lib/playDecks";
import { SERIF, SANS, SCRIPT } from "@/lib/typography";
import { buzz } from "@/lib/haptics";

const CARD: React.CSSProperties = {
  background: "var(--cream)",
  border: "1.5px solid rgba(var(--pink-rgb), .35)",
  borderRadius: 20,
  padding: "clamp(1.3rem, 4vw, 1.9rem)",
  boxShadow: "0 12px 40px rgba(var(--pink-deep-rgb), .1)",
};

function pickDilemma(last: Dilemma | null): Dilemma {
  let d = WOULD_YOU_RATHER[Math.floor(Math.random() * WOULD_YOU_RATHER.length)];
  while (last && d === last) d = WOULD_YOU_RATHER[Math.floor(Math.random() * WOULD_YOU_RATHER.length)];
  return d;
}

export default function WouldYouRather() {
  const [d, setD] = useState<Dilemma | null>(null);
  const [chose, setChose] = useState<"a" | "b" | null>(null);
  const lastRef = useRef<Dilemma | null>(null);

  const next = () => {
    buzz("tap");
    const nd = pickDilemma(lastRef.current);
    lastRef.current = nd;
    setD(nd);
    setChose(null);
  };

  const optStyle = (side: "a" | "b"): React.CSSProperties => {
    const sel = chose === side;
    return {
      flex: 1, fontFamily: SANS, fontSize: "0.95rem", fontWeight: 700, cursor: "pointer",
      padding: "1.1rem 1rem", borderRadius: 16, lineHeight: 1.35, textAlign: "center",
      background: sel ? "linear-gradient(135deg, var(--pink), var(--pink-deep))" : "rgba(var(--pink-rgb), .08)",
      color: sel ? "#fff" : "var(--text)",
      border: `1.5px solid rgba(var(--pink-rgb), ${sel ? ".6" : ".28"})`,
      transition: "background .15s",
    };
  };

  return (
    <div style={{ width: "100%", maxWidth: 640, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
        <div style={{ fontSize: "1.6rem" }}>💌</div>
        <h2 style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, fontSize: "clamp(1.4rem,4vw,1.8rem)", color: "var(--pink-deep)", margin: "0.1rem 0 0.2rem" }}>
          would you rather
        </h2>
        <p style={{ fontFamily: SCRIPT, fontSize: "1rem", color: "var(--muted)", margin: 0 }}>
          tiny dilemmas to laugh (and argue) over
        </p>
      </div>

      <div style={CARD}>
        {!d ? (
          <div style={{ textAlign: "center", padding: "0.6rem 0 1.2rem" }}>
            <p style={{ fontFamily: SCRIPT, fontSize: "1.1rem", color: "var(--muted)", margin: "0 0 1rem" }}>ready for the first one?</p>
            <motion.button whileTap={{ scale: 0.96 }} onClick={next} style={btn()}>start 💞</motion.button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={`${d.a}-${d.b}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              <div style={{ display: "flex", gap: "0.7rem", alignItems: "stretch" }}>
                <button style={optStyle("a")} onClick={() => { setChose("a"); buzz("tap"); }}>{d.a}</button>
                <div style={{ alignSelf: "center", fontFamily: SCRIPT, color: "var(--muted)", fontSize: "0.9rem" }}>or</div>
                <button style={optStyle("b")} onClick={() => { setChose("b"); buzz("tap"); }}>{d.b}</button>
              </div>
              <div style={{ textAlign: "center", marginTop: "1.1rem", minHeight: 28 }}>
                {chose && (
                  <p style={{ fontFamily: SCRIPT, fontSize: "1.05rem", color: "var(--pink-deep)", margin: 0 }}>
                    now ask them theirs — same or different? 💞
                  </p>
                )}
              </div>
              <div style={{ display: "flex", justifyContent: "center", marginTop: "0.8rem" }}>
                <motion.button whileTap={{ scale: 0.96 }} onClick={next} style={btn()}>next one 🔁</motion.button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function btn(): React.CSSProperties {
  return { fontFamily: SANS, fontSize: "0.9rem", fontWeight: 700, border: "none", borderRadius: 50, padding: "0.6rem 1.5rem", cursor: "pointer", background: "linear-gradient(135deg, var(--pink), var(--pink-deep))", color: "#fff" };
}
