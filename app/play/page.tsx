"use client";
import PasswordGate    from "@/components/PasswordGate";
import CoupleQuiz      from "@/components/CoupleQuiz";
import TruthOrDare     from "@/components/TruthOrDare";
import WouldYouRather  from "@/components/WouldYouRather";
import WeeklyCheckin   from "@/components/WeeklyCheckin";
import Ideas           from "@/components/Ideas";
import SideNav         from "@/components/SideNav";
import ErrorBoundary   from "@/components/ErrorBoundary";
import { SERIF, SCRIPT } from "@/lib/typography";

/** Games & quizzes, all in one place — the home for the playful, two-player
 *  corners of the app so they're easy to find instead of scattered. */

function PlayHero() {
  return (
    <div style={{
      position: "relative", textAlign: "center", overflow: "hidden",
      padding: "clamp(3.5rem,8vh,5.5rem) clamp(1rem,4vw,2rem) clamp(1rem,3vh,1.5rem)",
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

/** A plain centering wrapper (not a <section>, so it never paints its own
 *  background band) — every game sits on the page's single continuous flow,
 *  with the same equal top/bottom spacing as the flow-page sections. */
function Band({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <div id={id} style={{ width: "100%", padding: "clamp(6rem,15vh,10rem) clamp(1rem,4vw,2rem)", display: "flex", justifyContent: "center", scrollMarginTop: 72 }}>
      <div style={{ width: "100%", maxWidth: 760 }}>{children}</div>
    </div>
  );
}

const PLAY_NAV = [
  { id: "quiz",    label: "compatibility quiz" },
  { id: "truth",   label: "truth or dare" },
  { id: "rather",  label: "would you rather" },
  { id: "checkin", label: "weekly check-in" },
  { id: "ideas",   label: "reconnect ideas" },
];

function PlayContent() {
  return (
    <>
      <main className="flow-page">
        <PlayHero />
        <Band id="quiz"><ErrorBoundary><CoupleQuiz /></ErrorBoundary></Band>
        <Band id="truth"><ErrorBoundary><TruthOrDare /></ErrorBoundary></Band>
        <Band id="rather"><ErrorBoundary><WouldYouRather /></ErrorBoundary></Band>
        <Band id="checkin"><ErrorBoundary><WeeklyCheckin /></ErrorBoundary></Band>
        <div id="ideas" style={{ scrollMarginTop: 72 }}>
          <ErrorBoundary><Ideas flat mode="reconnect" emoji="🤍" heading="feeling a little distant?" sub="tiny ways to reconnect today" /></ErrorBoundary>
        </div>
      </main>
      <SideNav items={PLAY_NAV} />
    </>
  );
}

export default function PlayPage() {
  return <PasswordGate><PlayContent /></PasswordGate>;
}
