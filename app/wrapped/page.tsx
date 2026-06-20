"use client";
import { motion } from "framer-motion";
import PasswordGate from "@/components/PasswordGate";
import Wrapped      from "@/components/Wrapped";
import ErrorBoundary from "@/components/ErrorBoundary";
import { DISPLAY, SANS, SCRIPT } from "@/lib/typography";

/** Ambient decorative layer so the wide desktop margins beside the phone feel
 *  alive and intentional instead of an empty void. Theme-aware (uses the pink
 *  accent vars), purely decorative, behind the content. */
function Backdrop() {
  const orbs = [
    { l: "8%",  t: "18%", s: 360, c: "rgba(var(--pink-rgb),0.22)" },
    { l: "78%", t: "12%", s: 300, c: "rgba(var(--pink-mid-rgb,249,168,212),0.20)" },
    { l: "82%", t: "62%", s: 340, c: "rgba(var(--pink-deep-rgb),0.14)" },
    { l: "4%",  t: "66%", s: 280, c: "rgba(var(--pink-rgb),0.18)" },
  ];
  const hearts = ["💗","🩷","✨","💞","🌸","💕","🩷","✨","💗","🌷"];
  return (
    <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
      {orbs.map((o, i) => (
        <motion.div key={i}
          animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.85, 0.5] }}
          transition={{ repeat: Infinity, duration: 7 + i, delay: i * 1.1, ease: "easeInOut" }}
          style={{ position: "absolute", left: o.l, top: o.t, width: o.s, height: o.s, borderRadius: "50%", background: o.c, filter: "blur(60px)" }}
        />
      ))}
      {hearts.map((h, i) => (
        <motion.span key={`h${i}`}
          initial={{ y: "108vh", opacity: 0 }}
          animate={{ y: "-12vh", opacity: [0, 0.5, 0] }}
          transition={{ repeat: Infinity, duration: 13 + (i % 4) * 3, delay: i * 1.6, ease: "linear" }}
          style={{ position: "absolute", left: `${(i * 9.5 + 3) % 100}%`, fontSize: `${15 + (i % 3) * 7}px`, filter: "saturate(0.9)" }}
        >
          {h}
        </motion.span>
      ))}
    </div>
  );
}

function WrappedHero() {
  return (
    <div style={{
      position: "relative", textAlign: "center", overflow: "hidden",
      padding: "clamp(3rem,7vh,4.5rem) clamp(1rem,4vw,2rem) clamp(1rem,3vh,1.8rem)",
      // A soft radial glow that fades fully to transparent — blends seamlessly
      // into the page in every theme (light or dark), no hard seam.
      background: "radial-gradient(120% 85% at 50% -15%, rgba(var(--pink-rgb),0.32), rgba(var(--pink-rgb),0) 62%)",
    }}>
      <p style={{ fontFamily: SANS, fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(var(--pink-deep-rgb), .6)", margin: "0 0 0.5rem" }}>
        ✦ us, wrapped ✦
      </p>
      <h1 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: "clamp(2.3rem,6.5vw,3.6rem)", color: "var(--pink-deep)", margin: "0 0 0.4rem", lineHeight: 1.08, letterSpacing: "-0.01em" }}>
        your story, in numbers
      </h1>
      <p style={{ fontFamily: SCRIPT, fontSize: "clamp(1.05rem,2.5vw,1.25rem)", color: "var(--muted)", margin: 0 }}>
        everything you&apos;ve built together — and a card to share 💞
      </p>
    </div>
  );
}

export default function WrappedPage() {
  return (
    <PasswordGate>
      <Backdrop />
      <main style={{ position: "relative", zIndex: 1 }}>
        <WrappedHero />
        <section style={{ padding: "clamp(1rem,3vh,2rem) clamp(1rem,4vw,2rem) clamp(3rem,7vh,5rem)", display: "flex", justifyContent: "center" }}>
          <ErrorBoundary><Wrapped /></ErrorBoundary>
        </section>
      </main>
    </PasswordGate>
  );
}
