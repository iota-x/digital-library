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
import Final         from "@/components/Final";

if (typeof window !== "undefined") fetchCalendarData();

export default function Home() {
  useEffect(() => { fetchCalendarData(); }, []);
  return (
    <PasswordGate>
      <main>
        <Polaroids />
        <LiveTimer />
        <div style={{ padding: "0 clamp(1rem,3vw,2rem)" }}>
          <OnThisDay />
        </div>
        <MemoryCards />
        <ButtonSection />
        <VoiceNote />
        <Final />
      </main>
    </PasswordGate>
  );
}