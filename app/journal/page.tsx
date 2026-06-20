"use client";
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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
import UsByNumbers       from "@/components/UsByNumbers";
import SideNav           from "@/components/SideNav";
import AmbientBackdrop   from "@/components/AmbientBackdrop";
import ErrorBoundary     from "@/components/ErrorBoundary";

const JOURNAL_NAV = [
  { id: "calendar", label: "calendar" },
  { id: "streak",   label: "streak" },
  { id: "surprise", label: "surprise me" },
  { id: "recap",    label: "monthly recap" },
  { id: "numbers",  label: "by the numbers" },
];

function JournalPageInner() {
  const params = useSearchParams();
  // ?date=YYYY-MM-DD opens that day's modal on mount (the palette navigates
  // here with this param when a journal-entry result is picked).
  const dateParam = params.get("date") || undefined;

  useEffect(() => { fetchCalendarData(); }, []);

  // Scroll to the calendar when a date is requested so the modal animation
  // anchors to a visible spot. Run after layout settles.
  useEffect(() => {
    if (!dateParam) return;
    const id = setTimeout(() => {
      document.getElementById("calendar")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
    return () => clearTimeout(id);
  }, [dateParam]);

  const { trackRef, refreshing } = usePullToRefresh(() => fetchCalendarData());
  return (
    <PasswordGate>
      <div ref={trackRef} className="ptr-track">
        <div className={`ptr-indicator ${refreshing ? "spinning" : ""}`} aria-hidden>↻</div>
        <main className="flow-page">
          <AmbientBackdrop />
          <JournalHeader />
          <ErrorBoundary><JournalSearch /></ErrorBoundary>
          <div style={{ padding: "2rem clamp(1rem,3vw,2rem) 0" }}>
            <ErrorBoundary><AnniversaryBanner /></ErrorBoundary>
            <ErrorBoundary><OnThisDay /></ErrorBoundary>
          </div>
          {/* calendar / streak / surprise / recap already carry their own
              section ids internally — the side-nav targets those directly. */}
          <ErrorBoundary><OurCalendar initialDate={dateParam} /></ErrorBoundary>
          <ErrorBoundary><StreakTracker /></ErrorBoundary>
          <ErrorBoundary><SurpriseMe /></ErrorBoundary>
          <ErrorBoundary><MonthlyRecap /></ErrorBoundary>
          <div id="numbers" style={{ scrollMarginTop: 72 }}><ErrorBoundary><UsByNumbers /></ErrorBoundary></div>
        </main>
      </div>
      <SideNav items={JOURNAL_NAV} />
    </PasswordGate>
  );
}

export default function JournalPage() {
  // useSearchParams must live under a Suspense boundary in Next 15 app router
  return (
    <Suspense fallback={null}>
      <JournalPageInner />
    </Suspense>
  );
}
