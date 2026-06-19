"use client";
import { useEffect } from "react";
import { fetchCalendarData } from "@/lib/calendarStore";
import PasswordGate  from "@/components/PasswordGate";
import Polaroids     from "@/components/Polaroids";
import LiveTimer     from "@/components/LiveTimer";
import OnThisDay     from "@/components/OnThisDay";
import Explore       from "@/components/Explore";
import DateReminders from "@/components/DateReminders";
import MemoryCards   from "@/components/MemoryCards";
import ButtonSection from "@/components/ButtonSection";
import VoiceNote     from "@/components/VoiceNote";
import CapsuleTeaser from "@/components/CapsuleTeaser";
import Final         from "@/components/Final";
import ErrorBoundary from "@/components/ErrorBoundary";
import SectionNav, { type Section } from "@/components/SectionNav";
import { useUserData } from "@/lib/userStore";
import { sectionVisible } from "@/lib/themes";

/** Wrapper that gives a home section a scroll anchor (offset for the sticky bars). */
function Anchor({ id, children }: { id: string; children: React.ReactNode }) {
  return <div id={id} style={{ scrollMarginTop: 120 }}>{children}</div>;
}

function HomeContent() {
  const user = useUserData();
  const sv = (key: string) => sectionVisible(user?.settings, "home", key);

  useEffect(() => { fetchCalendarData(); }, []);

  // Build the jump-to list from whatever sections are actually visible.
  const sections: Section[] = [
    { id: "moments", label: "moments", emoji: "📸" },
    ...(sv("showTimer") ? [{ id: "timer", label: "our timer", emoji: "⏳" }] : []),
    { id: "onthisday", label: "on this day", emoji: "📅" },
    ...(sv("showMemoryCards") ? [{ id: "cards", label: "memory cards", emoji: "💗" }] : []),
    { id: "explore", label: "explore", emoji: "🧭" },
    ...(sv("showVoiceNotes") ? [{ id: "voice", label: "voice notes", emoji: "🎙️" }] : []),
    ...(sv("showCapsuleTeaser") ? [{ id: "capsule", label: "capsule", emoji: "💌" }] : []),
    ...(sv("showFinal") ? [{ id: "letter", label: "a letter", emoji: "💗" }] : []),
  ];

  return (
    <main>
      <ErrorBoundary><DateReminders /></ErrorBoundary>
      <SectionNav sections={sections} />
      <Anchor id="moments"><ErrorBoundary><Polaroids /></ErrorBoundary></Anchor>
      {sv("showTimer") && <Anchor id="timer"><ErrorBoundary><LiveTimer /></ErrorBoundary></Anchor>}
      <Anchor id="onthisday">
        <div style={{ padding: "0 clamp(1rem,3vw,2rem)" }}>
          <ErrorBoundary><OnThisDay /></ErrorBoundary>
        </div>
      </Anchor>
      {sv("showMemoryCards") && <Anchor id="cards"><ErrorBoundary><MemoryCards /></ErrorBoundary></Anchor>}
      <Anchor id="explore"><ErrorBoundary><Explore /></ErrorBoundary></Anchor>
      <ErrorBoundary><ButtonSection /></ErrorBoundary>
      {sv("showVoiceNotes") && <Anchor id="voice"><ErrorBoundary><VoiceNote /></ErrorBoundary></Anchor>}
      {sv("showCapsuleTeaser") && <Anchor id="capsule"><ErrorBoundary><CapsuleTeaser /></ErrorBoundary></Anchor>}
      {sv("showFinal") && <Anchor id="letter"><ErrorBoundary><Final /></ErrorBoundary></Anchor>}
    </main>
  );
}

export default function Home() {
  return <PasswordGate><HomeContent /></PasswordGate>;
}
