"use client";
import PasswordGate  from "@/components/PasswordGate";
import LongDistance  from "@/components/LongDistance";
import WatchTogether from "@/components/WatchTogether";
import ErrorBoundary from "@/components/ErrorBoundary";
import { SERIF, SANS, SCRIPT } from "@/lib/typography";

function TogetherHero() {
  return (
    <div style={{
      textAlign: "center",
      padding: "clamp(3rem,7vh,4.5rem) clamp(1rem,4vw,2rem) clamp(1rem,3vh,1.8rem)",
      background: "linear-gradient(180deg,var(--rose) 0%,var(--pink-light) 60%,rgba(var(--pink-light-rgb),0) 100%)",
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

export default function TogetherPage() {
  return (
    <PasswordGate>
      <main>
        <TogetherHero />
        <section style={{ padding: "clamp(1.5rem,4vh,2.5rem) clamp(1rem,4vw,2rem) 0", display: "flex", justifyContent: "center" }}>
          <ErrorBoundary><LongDistance /></ErrorBoundary>
        </section>
        <section style={{ padding: "clamp(1.5rem,4vh,2.5rem) clamp(1rem,4vw,2rem) clamp(3rem,7vh,5rem)" }}>
          <ErrorBoundary><WatchTogether /></ErrorBoundary>
        </section>
      </main>
    </PasswordGate>
  );
}
