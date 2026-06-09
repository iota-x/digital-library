"use client";
import { useEffect } from "react";
import { fetchCalendarData } from "@/lib/calendarStore";
import PasswordGate      from "@/components/PasswordGate";
import AnniversaryBanner from "@/components/AnniversaryBanner";
import OurCalendar       from "@/components/OurCalendar";
import StreakTracker     from "@/components/StreakTracker";
import SurpriseMe       from "@/components/SurpriseMe";
import MonthlyRecap     from "@/components/MonthlyRecap";
import Final            from "@/components/Final";

/* Pre-fetch once when the page module loads — before any component mounts */
if (typeof window !== "undefined") fetchCalendarData();

export default function JournalPage() {
  /* Also kick off in effect as a safety net */
  useEffect(() => { fetchCalendarData(); }, []);

  return (
    <PasswordGate>
      <main>
        <div style={{ padding:"2rem clamp(1rem,3vw,2rem) 0" }}>
          <AnniversaryBanner />
        </div>
        <OurCalendar />
        <StreakTracker />
        <SurpriseMe />
        <MonthlyRecap />
      </main>
    </PasswordGate>
  );
}