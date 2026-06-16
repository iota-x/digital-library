"use client";
import { useEffect } from "react";
import { fetchCalendarData } from "@/lib/calendarStore";
import { usePullToRefresh } from "@/lib/usePullToRefresh";
import PasswordGate      from "@/components/PasswordGate";
import JournalHeader     from "@/components/JournalHeader";
import JournalSearch     from "@/components/JournalSearch";
import AnniversaryBanner from "@/components/AnniversaryBanner";
import OnThisDay         from "@/components/OnThisDay";
import OurCalendar       from "@/components/OurCalendar";
import StreakTracker     from "@/components/StreakTracker";
import SurpriseMe        from "@/components/SurpriseMe";
import MonthlyRecap      from "@/components/MonthlyRecap";

if (typeof window !== "undefined") fetchCalendarData();

export default function JournalPage() {
  useEffect(() => { fetchCalendarData(); }, []);
  const { trackRef, refreshing } = usePullToRefresh(() => fetchCalendarData());
  return (
    <PasswordGate>
      <div ref={trackRef} className="ptr-track">
        <div className={`ptr-indicator ${refreshing ? "spinning" : ""}`} aria-hidden>↻</div>
        <main>
          <JournalHeader />
          <JournalSearch />
          <div style={{ padding: "2rem clamp(1rem,3vw,2rem) 0" }}>
            <AnniversaryBanner />
            <OnThisDay />
          </div>
          <OurCalendar />
          <StreakTracker />
          <SurpriseMe />
          <MonthlyRecap />
        </main>
      </div>
    </PasswordGate>
  );
}
