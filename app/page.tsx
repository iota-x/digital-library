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
import UnpairedCard   from "@/components/UnpairedCard";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useUserData } from "@/lib/userStore";
import { sectionVisible } from "@/lib/themes";
import { HOME_SECTIONS, orderedKeys } from "@/lib/sections";

function HomeContent() {
  const user = useUserData();
  const sv = (key: string) => sectionVisible(user?.settings, "home", key);

  useEffect(() => { fetchCalendarData(); }, []);

  // Map each section key to its rendered node. Order + visibility are driven by
  // the couple's settings (lib/sections.ts canonical order as the fallback).
  const nodes: Record<string, React.ReactNode> = {
    reminders:   <DateReminders />,
    hero:        <Polaroids />,
    timer:       <LiveTimer />,
    onthisday:   <div style={{ padding: "0 clamp(1rem,3vw,2rem)" }}><OnThisDay /></div>,
    memorycards: <MemoryCards />,
    explore:     <Explore />,
    buttons:     <ButtonSection />,
    voice:       <VoiceNote />,
    capsule:     <CapsuleTeaser />,
    final:       <Final />,
  };
  const order = orderedKeys(HOME_SECTIONS.map(s => s.key), user?.settings?.sectionOrder?.home);

  return (
    <main>
      <ErrorBoundary><UnpairedCard /></ErrorBoundary>
      {order.map(key => {
        const meta = HOME_SECTIONS.find(s => s.key === key);
        if (!meta || !nodes[key]) return null;
        if (meta.toggle && !sv(meta.toggle)) return null;
        return <ErrorBoundary key={key}>{nodes[key]}</ErrorBoundary>;
      })}
    </main>
  );
}

export default function Home() {
  return <PasswordGate><HomeContent /></PasswordGate>;
}
