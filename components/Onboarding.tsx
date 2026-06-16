"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useUserData } from "@/lib/userStore";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { SERIF, SANS, SCRIPT } from "@/lib/typography";


const STORAGE_KEY = "ann_onboarded_v1";

interface Step {
  emoji: string;
  title: string;
  body: string;
  cta: string;
  /** Optional in-app navigation triggered by the CTA. */
  go?: string;
  /** Optional broadcast event the CTA should dispatch (e.g. opens settings panel). */
  dispatch?: string;
}

const STEPS: Step[] = [
  {
    emoji: "💌",
    title: "write your first letter",
    body: "Sealed letters unlock on a date you choose. Birthdays, anniversaries, just-because days.",
    cta: "open capsule",
    go: "/capsule",
  },
  {
    emoji: "📅",
    title: "add your first memory",
    body: "Drop a note, a photo, or a voice clip on any day. The calendar fills itself with your story.",
    cta: "open journal",
    go: "/journal",
  },
  {
    emoji: "🎨",
    title: "make it yours",
    body: "Pick a theme, name your space, add love notes that float around. It's your little world.",
    cta: "customize",
    dispatch: "annapp:settings",
  },
];

export default function Onboarding() {
  const router = useRouter();
  const user = useUserData();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, { active: visible, onEscape: () => setVisible(false) });

  useEffect(() => {
    if (!user) return;
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {}
    // Only show for accounts that just registered (zero data) — heuristic via
    // localStorage flag set by LandingPage after onSuccess. If absent, we still
    // show once on first session after this code ships.
    setVisible(true);
  }, [user]);

  const done = (skip = false) => {
    try { localStorage.setItem(STORAGE_KEY, skip ? "skipped" : "done"); } catch {}
    setVisible(false);
  };

  const cur = STEPS[step];
  const next = () => {
    if (step + 1 < STEPS.length) setStep(s => s + 1);
    else done();
  };

  const act = () => {
    if (cur.dispatch) window.dispatchEvent(new Event(cur.dispatch));
    if (cur.go) router.push(cur.go);
    done();
  };

  return (
    <AnimatePresence>
      {visible && cur && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 9970, background: "rgba(0,0,0,.55)", backdropFilter: "blur(8px)" }}
          />
          <motion.div
            key={step}
            ref={dialogRef}
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            role="dialog" aria-modal="true" aria-labelledby="onboard-title" aria-describedby="onboard-body"
            className="mobile-sheet"
            style={{
              position: "fixed", zIndex: 9971,
              top: "50%", left: "50%", transform: "translate(-50%, -50%)",
              width: "min(440px, 92vw)",
              background: "var(--cream)",
              border: "1.5px solid var(--pink-mid)",
              borderRadius: 24, padding: "2rem 1.7rem 1.7rem",
              textAlign: "center",
              boxShadow: "0 32px 80px rgba(var(--pink-deep-rgb),.3)",
            }}
          >
            <p style={{ fontFamily: SANS, fontSize: "0.65rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--muted)", margin: "0 0 0.6rem", fontWeight: 700 }}>
              step {step + 1} of {STEPS.length}
            </p>
            <motion.div
              key={step + "-emoji"}
              initial={{ scale: 0.7, rotate: -8 }} animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200 }}
              style={{ fontSize: "3.4rem", marginBottom: "0.5rem" }}
            >
              {cur.emoji}
            </motion.div>
            <h2 id="onboard-title" style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "1.5rem", color: "var(--pink-deep)", margin: "0 0 0.5rem", fontWeight: 400 }}>
              {cur.title}
            </h2>
            <p id="onboard-body" style={{ fontFamily: SANS, fontSize: "0.92rem", color: "var(--text)", margin: "0 0 1.5rem", lineHeight: 1.55 }}>
              {cur.body}
            </p>

            {/* Progress dots */}
            <div style={{ display: "flex", justifyContent: "center", gap: "0.4rem", marginBottom: "1.2rem" }}>
              {STEPS.map((_, i) => (
                <span key={i} style={{
                  width: i === step ? 22 : 8, height: 8, borderRadius: 50,
                  background: i === step ? "var(--pink-deep)" : "rgba(var(--pink-rgb),.3)",
                  transition: "all .25s",
                }} />
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <motion.button
                onClick={act}
                whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
                style={{
                  fontFamily: SANS, fontSize: "0.95rem", fontWeight: 700, color: "#fff",
                  background: "linear-gradient(135deg,var(--pink),var(--pink-deep))",
                  border: "none", borderRadius: 50, padding: "0.8rem 1.6rem", cursor: "pointer",
                  boxShadow: "0 6px 22px rgba(var(--pink-deep-rgb),.32)",
                }}
              >
                {cur.cta}
              </motion.button>
              <button onClick={next}
                style={{
                  fontFamily: SCRIPT, fontSize: "1rem", color: "var(--muted)",
                  background: "none", border: "none", cursor: "pointer", padding: "0.3rem",
                }}>
                {step + 1 < STEPS.length ? "next →" : "all done ✨"}
              </button>
              {step === 0 && (
                <button onClick={() => done(true)}
                  style={{ fontFamily: SANS, fontSize: "0.75rem", color: "var(--muted)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", marginTop: "-0.2rem" }}>
                  skip — i'll explore on my own
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
