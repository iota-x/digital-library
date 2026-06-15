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

export default function Home() {
  useEffect(() => { fetchCalendarData(); }, []);
  return (
    <PasswordGate>
      <main>
        <ErrorBoundary><Polaroids /></ErrorBoundary>
        <ErrorBoundary><LiveTimer /></ErrorBoundary>
        <div style={{ padding: "0 clamp(1rem,3vw,2rem)" }}>
          <ErrorBoundary><OnThisDay /></ErrorBoundary>
        </div>
        <ErrorBoundary><MemoryCards /></ErrorBoundary>
        <ButtonSection />
        <ErrorBoundary><VoiceNote /></ErrorBoundary>
        <ErrorBoundary><CapsuleTeaser /></ErrorBoundary>
        <ErrorBoundary><Final /></ErrorBoundary>
      </main>
    </PasswordGate>
  );
}
