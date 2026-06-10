"use client";
import { useEffect } from "react";
import { fetchCalendarData } from "@/lib/calendarStore";
import PasswordGate      from "@/components/PasswordGate";
import AnniversaryBanner from "@/components/AnniversaryBanner";
import OnThisDay         from "@/components/OnThisDay";
import OurCalendar       from "@/components/OurCalendar";
import StreakTracker     from "@/components/StreakTracker";
import SurpriseMe        from "@/components/SurpriseMe";
import MonthlyRecap      from "@/components/MonthlyRecap";
import Final             from "@/components/Final";

if (typeof window !== "undefined") fetchCalendarData();

export default function JournalPage() {
  useEffect(() => { fetchCalendarData(); }, []);
  return (
    <PasswordGate>
      <main>
        <div style={{ padding:"2rem clamp(1rem,3vw,2rem) 0" }}>
          <AnniversaryBanner />
          <OnThisDay />
        </div>
        <OurCalendar />
        <StreakTracker />
        <SurpriseMe />
        <MonthlyRecap />
      </main>
    </PasswordGate>
  );
}