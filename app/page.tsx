"use client";
import { useEffect } from "react";
import { fetchCalendarData } from "@/lib/calendarStore";
import PasswordGate  from "@/components/PasswordGate";
import Polaroids     from "@/components/Polaroids";
import LiveTimer     from "@/components/LiveTimer";
import OnThisDay     from "@/components/OnThisDay";
import MemoryCards   from "@/components/MemoryCards";
import ButtonSection from "@/components/ButtonSection";
import VoiceNote     from "@/components/VoiceNote";
import CapsuleTeaser from "@/components/CapsuleTeaser";
import Final         from "@/components/Final";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useUserData } from "@/lib/userStore";
import { sectionVisible } from "@/lib/themes";

function HomeContent() {
  const user = useUserData();
  const sv = (key: string) => sectionVisible(user?.settings, "home", key);

  useEffect(() => { fetchCalendarData(); }, []);

  return (
    <main>
      <ErrorBoundary><Polaroids /></ErrorBoundary>
      {sv("showTimer") && <ErrorBoundary><LiveTimer /></ErrorBoundary>}
      <div style={{ padding: "0 clamp(1rem,3vw,2rem)" }}>
        <ErrorBoundary><OnThisDay /></ErrorBoundary>
      </div>
      {sv("showMemoryCards") && <ErrorBoundary><MemoryCards /></ErrorBoundary>}
      <ErrorBoundary><ButtonSection /></ErrorBoundary>
      {sv("showVoiceNotes") && <ErrorBoundary><VoiceNote /></ErrorBoundary>}
      {sv("showCapsuleTeaser") && <ErrorBoundary><CapsuleTeaser /></ErrorBoundary>}
      {sv("showFinal") && <ErrorBoundary><Final /></ErrorBoundary>}
    </main>
  );
}

export default function Home() {
  return <PasswordGate><HomeContent /></PasswordGate>;
}
