"use client";
import OpeningScreen  from "@/components/OpeningScreen";
import Polaroids      from "@/components/Polaroids";
import LiveTimer      from "@/components/LiveTimer";
import MemoryCards    from "@/components/MemoryCards";
import ButtonSection  from "@/components/ButtonSection";
import Timeline       from "@/components/Timeline";
import VoiceNote      from "@/components/VoiceNote";
import Final          from "@/components/Final";

export default function Home() {
  return (
    <main>
      <OpeningScreen />
      <Polaroids />
      <LiveTimer />
      <MemoryCards />
      <ButtonSection />
      <Timeline />
      <VoiceNote />
      <Final />
    </main>
  );
}