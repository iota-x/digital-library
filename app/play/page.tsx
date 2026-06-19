"use client";
import PasswordGate    from "@/components/PasswordGate";
import CoupleQuiz      from "@/components/CoupleQuiz";
import TruthOrDare     from "@/components/TruthOrDare";
import WouldYouRather  from "@/components/WouldYouRather";
import WeeklyCheckin   from "@/components/WeeklyCheckin";
import Ideas           from "@/components/Ideas";
import ErrorBoundary   from "@/components/ErrorBoundary";
import { SERIF, SCRIPT } from "@/lib/typography";

/** Games & quizzes, all in one place — the home for the playful, two-player
 *  corners of the app so they're easy to find instead of scattered. */

function PlayHero() {
  return (
    <div style={{
      position: "relative", textAlign: "center", overflow: "hidden",
      padding: "clamp(3.5rem,8vh,5.5rem) clamp(1rem,4vw,2rem) clamp(1.5rem,4vh,2.5rem)",
      background: "linear-gradient(180deg,var(--rose) 0%,var(--pink-light) 60%,rgba(var(--pink-light-rgb),0) 100%)",
    }}>
      <p style={{ fontFamily: SCRIPT, fontSize: "clamp(1rem,2.5vw,1.2rem)", color: "var(--muted)", margin: "0 0 0.5rem" }}>
        a little fun, just the two of you ✦
      </p>
      <h1 style={{
        fontFamily: SERIF, fontStyle: "italic", fontWeight: 400,
        fontSize: "clamp(2.3rem,6vw,3.6rem)", color: "var(--pink-deep)",
        margin: "0 0 0.5rem", lineHeight: 1.1,
      }}>
        games &amp; quizzes
      </h1>
      <p style={{ fontFamily: SCRIPT, fontSize: "clamp(1.05rem,2.5vw,1.25rem)", color: "var(--muted)", margin: 0 }}>
        play together · see how in sync you are 💞
      </p>
    </div>
  );
}

function Band({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <section style={{ width: "100%", padding: "clamp(1.6rem,4vh,2.6rem) clamp(1rem,4vw,2rem)", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 760 }}>
        {label && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", justifyContent: "center", marginBottom: "1.2rem", opacity: 0.7 }}>
            <div style={{ height: 1, flex: "0 1 60px", background: "linear-gradient(90deg,transparent,rgba(var(--pink-deep-rgb),.3))" }} />
            <span style={{ fontFamily: SCRIPT, fontSize: "0.95rem", color: "var(--muted)" }}>{label}</span>
            <div style={{ height: 1, flex: "0 1 60px", background: "linear-gradient(90deg,rgba(var(--pink-deep-rgb),.3),transparent)" }} />
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

function PlayContent() {
  return (
    <main>
      <PlayHero />
      <Band><ErrorBoundary><CoupleQuiz /></ErrorBoundary></Band>
      <Band label="🎲 quick games"><ErrorBoundary><TruthOrDare /></ErrorBoundary></Band>
      <Band><ErrorBoundary><WouldYouRather /></ErrorBoundary></Band>
      <Band label="🤍 just for us"><ErrorBoundary><WeeklyCheckin /></ErrorBoundary></Band>
      <ErrorBoundary>
        <Ideas mode="reconnect" emoji="🤍" heading="feeling a little distant?" sub="tiny ways to reconnect today" />
      </ErrorBoundary>
    </main>
  );
}

export default function PlayPage() {
  return <PasswordGate><PlayContent /></PasswordGate>;
}
