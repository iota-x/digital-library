"use client";
import PasswordGate from "@/components/PasswordGate";
import Wrapped      from "@/components/Wrapped";
import ErrorBoundary from "@/components/ErrorBoundary";
import { SERIF, SANS, SCRIPT } from "@/lib/typography";

function WrappedHero() {
  return (
    <div style={{
      textAlign: "center",
      padding: "clamp(3rem,7vh,4.5rem) clamp(1rem,4vw,2rem) clamp(1rem,3vh,1.8rem)",
      background: "linear-gradient(180deg,var(--rose) 0%,var(--pink-light) 60%,rgba(var(--pink-light-rgb),0) 100%)",
    }}>
      <p style={{ fontFamily: SANS, fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(var(--pink-deep-rgb), .5)", margin: "0 0 0.4rem" }}>
        us, wrapped
      </p>
      <h1 style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, fontSize: "clamp(2.2rem,6vw,3.4rem)", color: "var(--pink-deep)", margin: "0 0 0.4rem", lineHeight: 1.1 }}>
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
      <main>
        <WrappedHero />
        <section style={{ padding: "clamp(1rem,3vh,2rem) clamp(1rem,4vw,2rem) clamp(3rem,7vh,5rem)", display: "flex", justifyContent: "center" }}>
          <ErrorBoundary><Wrapped /></ErrorBoundary>
        </section>
      </main>
    </PasswordGate>
  );
}
