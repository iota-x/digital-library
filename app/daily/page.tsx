"use client";
import PasswordGate  from "@/components/PasswordGate";
import DailyQuestion from "@/components/DailyQuestion";
import DailyArchive  from "@/components/DailyArchive";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useUserData } from "@/lib/userStore";
import { SERIF, SANS, SCRIPT } from "@/lib/typography";

/** Page header for the daily-question surface — mirrors the journal header's
 *  hairline-and-heart treatment so /daily feels native to the rest of the app. */
function DailyHeader() {
  return (
    <div style={{
      padding: "2.5rem clamp(1rem,3vw,2rem) 0.5rem",
      // fades into the page's flow wash — no hard header seam/border
      background: "radial-gradient(120% 90% at 50% -10%, rgba(var(--pink-rgb),.22), transparent 60%)",
      textAlign: "center",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", marginBottom: "0.7rem" }}>
        <div style={{ width: 48, height: 1, background: "linear-gradient(90deg,transparent,rgba(var(--pink-deep-rgb),.3))" }} />
        <span className="occ-heart" style={{ fontSize: "1.5rem" }}>💭</span>
        <div style={{ width: 48, height: 1, background: "linear-gradient(90deg,rgba(var(--pink-deep-rgb),.3),transparent)" }} />
      </div>
      <h1 style={{
        fontFamily: SERIF, fontStyle: "italic",
        fontSize: "clamp(2rem,5vw,2.8rem)",
        color: "var(--pink-deep)", margin: "0 0 0.3rem", fontWeight: 400,
        textShadow: "0 2px 16px rgba(var(--pink-deep-rgb),.12)",
      }}>
        question of the day
      </h1>
      <p style={{ fontFamily: SCRIPT, fontSize: "clamp(1rem,2.5vw,1.2rem)", color: "rgba(var(--pink-deep-rgb),.5)", margin: 0 }}>
        a little something to answer together 🌸
      </p>
    </div>
  );
}

/** Shown when a partner hasn't joined yet — the daily question needs two people
 *  to reveal, so there's nothing to show until then. */
function SoloNote({ inviteCode }: { inviteCode?: string | null }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "clamp(2.5rem,7vh,4.5rem) clamp(1rem,4vw,2rem)" }}>
      <div style={{
        width: "100%", maxWidth: 520, textAlign: "center",
        background: "var(--cream)", border: "1.5px solid rgba(var(--pink-rgb),.35)",
        borderRadius: 22, padding: "clamp(1.5rem,5vw,2.4rem)",
        boxShadow: "0 12px 40px rgba(var(--pink-deep-rgb),.1)",
      }}>
        <div style={{ fontSize: "2.2rem", marginBottom: "0.6rem" }}>💌</div>
        <h2 style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, fontSize: "1.4rem", color: "var(--pink-deep)", margin: "0 0 0.5rem" }}>
          waiting for your person
        </h2>
        <p style={{ fontFamily: SANS, fontSize: "0.92rem", color: "var(--muted)", lineHeight: 1.55, margin: 0 }}>
          Once they join, you&apos;ll both get a question each day — answer it
          privately and it unlocks the moment you both do. 💞
        </p>
        {inviteCode && (
          <p style={{ fontFamily: SANS, fontSize: "0.82rem", color: "var(--muted)", marginTop: "1.1rem" }}>
            your invite code:{" "}
            <strong style={{ fontFamily: SERIF, color: "var(--pink-deep)", letterSpacing: "0.25em" }}>{inviteCode}</strong>
          </p>
        )}
      </div>
    </div>
  );
}

function DailyContent() {
  const user = useUserData();
  const solo = !!user && !user.partnerName;

  return (
    <main className="flow-page">
      <DailyHeader />
      {solo ? (
        <SoloNote inviteCode={user?.inviteCode} />
      ) : (
        <>
          <ErrorBoundary><DailyQuestion /></ErrorBoundary>
          <ErrorBoundary><DailyArchive /></ErrorBoundary>
        </>
      )}
    </main>
  );
}

export default function DailyPage() {
  return <PasswordGate><DailyContent /></PasswordGate>;
}
