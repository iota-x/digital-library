"use client";
import { useState }       from "react";
import PasswordGate       from "@/components/PasswordGate";
import OpeningScreen      from "@/components/OpeningScreen";
import Polaroids          from "@/components/Polaroids";
import LiveTimer          from "@/components/LiveTimer";
import MemoryCards        from "@/components/MemoryCards";
import ButtonSection      from "@/components/ButtonSection";
import Timeline           from "@/components/Timeline";
import OurCalendar        from "@/components/OurCalendar";
import StreakTracker      from "@/components/StreakTracker";
import SurpriseMe         from "@/components/SurpriseMe";
import MonthlyRecap       from "@/components/MonthlyRecap";
import TimeCapsule        from "@/components/TimeCapsule";
import VoiceNote          from "@/components/VoiceNote";
import Final              from "@/components/Final";
import Navbar             from "@/components/Navbar";


/* ── Page ── */
export default function Home() {
  const [activeTab, setActiveTab] = useState<"home" | "timeline" | "calendar" | "capsule">("home");

  return (
    <PasswordGate>
      {/* Navbar floats above everything */}
      <Navbar active={activeTab} onTabChange={setActiveTab} />

      <main>
        {/* ── HOME section ──────────────────────────────── */}
        <section id="home">
          <OpeningScreen />
          <Polaroids />
          <LiveTimer />
          <MemoryCards />
          <ButtonSection />
          <VoiceNote />
        </section>

        {/* ── TIMELINE section ──────────────────────────── */}
        <section id="timeline">
          <Timeline />
        </section>

        {/* ── JOURNAL / CALENDAR section ────────────────── */}
        {/*
          OurCalendar already uses id="calendar" internally on its <section>,
          so scroll targets work. We wrap it in a parent for section grouping.
        */}
        <section id="journal">
          <OurCalendar />
          <StreakTracker />
          <SurpriseMe />
          <MonthlyRecap />
        </section>

        {/* ── TIME CAPSULE section ──────────────────────── */}
        <section id="timecapsule">
          <TimeCapsule />
        </section>

                  <Final />
      </main>
    </PasswordGate>
  );
}