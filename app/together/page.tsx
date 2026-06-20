"use client";
import { motion } from "framer-motion";
import PasswordGate  from "@/components/PasswordGate";
import LongDistance  from "@/components/LongDistance";
import WatchTogether from "@/components/WatchTogether";
import TogetherBackdrop from "@/components/TogetherBackdrop";
import ErrorBoundary from "@/components/ErrorBoundary";
import { SERIF, SCRIPT } from "@/lib/typography";

function TogetherHero() {
  return (
    <div style={{
      position: "relative", textAlign: "center", overflow: "hidden",
      padding: "clamp(3rem,7vh,4.5rem) clamp(1rem,4vw,2rem) clamp(1rem,3vh,1.8rem)",
      // fades into the page's flow wash — no hard header seam
      background: "radial-gradient(120% 90% at 50% -10%, rgba(var(--pink-rgb),.22), transparent 60%)",
    }}>
      <p style={{ fontFamily: SCRIPT, fontSize: "clamp(1rem,2.5vw,1.2rem)", color: "var(--muted)", margin: "0 0 0.5rem" }}>
        close, even when you&apos;re far ✦
      </p>
      <h1 style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, fontSize: "clamp(2.2rem,6vw,3.4rem)", color: "var(--pink-deep)", margin: "0 0 0.4rem", lineHeight: 1.1 }}>
        across the miles
      </h1>
      <p style={{ fontFamily: SCRIPT, fontSize: "clamp(1.05rem,2.5vw,1.25rem)", color: "var(--muted)", margin: 0 }}>
        your clocks, a little buzz, and a countdown to next time 💞
      </p>
    </div>
  );
}

/** Soft theme-coloured orbs for depth behind the night-sky canvas. */
function Orbs() {
  const orbs = [
    { l: "10%", t: "16%", s: 340, c: "rgba(var(--pink-rgb),0.16)" },
    { l: "78%", t: "30%", s: 320, c: "rgba(var(--pink-deep-rgb),0.13)" },
    { l: "50%", t: "78%", s: 380, c: "rgba(var(--pink-rgb),0.12)" },
  ];
  return (
    <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
      {orbs.map((o, i) => (
        <motion.div key={i}
          animate={{ scale: [1, 1.16, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ repeat: Infinity, duration: 8 + i, delay: i * 1.2, ease: "easeInOut" }}
          style={{ position: "absolute", left: o.l, top: o.t, width: o.s, height: o.s, borderRadius: "50%", background: o.c, filter: "blur(64px)" }}
        />
      ))}
    </div>
  );
}

function Band({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: "100%", padding: "clamp(2rem,4.5vh,3rem) clamp(1rem,4vw,2rem)", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 760 }}>{children}</div>
    </div>
  );
}

export default function TogetherPage() {
  return (
    <PasswordGate>
      <Orbs />
      <TogetherBackdrop />
      <main className="together-page" style={{ position: "relative", zIndex: 1 }}>
        <TogetherHero />
        <Band><ErrorBoundary><LongDistance /></ErrorBoundary></Band>
        <ErrorBoundary><WatchTogether /></ErrorBoundary>
        <div style={{ height: "clamp(2rem,5vh,4rem)" }} />
      </main>
    </PasswordGate>
  );
}
