"use client";
import PasswordGate  from "@/components/PasswordGate";
import OpeningScreen from "@/components/OpeningScreen";
import Polaroids     from "@/components/Polaroids";
import LiveTimer     from "@/components/LiveTimer";
import MemoryCards   from "@/components/MemoryCards";
import ButtonSection from "@/components/ButtonSection";
import Timeline      from "@/components/Timeline";
import OurCalendar   from "@/components/OurCalender";
import VoiceNote     from "@/components/VoiceNote";
import Final         from "@/components/Final";

export default function Home() {
  return (
    <PasswordGate>
      <main>
        <OpeningScreen />
        <Polaroids />
        <LiveTimer />
        <MemoryCards />
        <ButtonSection />
        <Timeline />
        <OurCalendar />
        <VoiceNote />
        <Final />
      </main>
    </PasswordGate>
  );
}