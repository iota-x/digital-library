"use client";
import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { fetchCalendarData } from "@/lib/calendarStore";
import PasswordGate      from "@/components/PasswordGate";
import JournalHeader     from "@/components/JournalHeader";
import AnniversaryBanner from "@/components/AnniversaryBanner";
import OnThisDay         from "@/components/OnThisDay";
import OurCalendar       from "@/components/OurCalendar";
import StreakTracker     from "@/components/StreakTracker";
import SurpriseMe        from "@/components/SurpriseMe";
import MonthlyRecap      from "@/components/MonthlyRecap";
import Final             from "@/components/Final";
import ExportPDF         from "@/components/ExportPDF";
import { useUserData }   from "@/lib/userStore";
import { sectionVisible } from "@/lib/themes";

function JournalContent() {
  const params = useSearchParams();
  const initialDate = params.get("date") ?? undefined;
  const user = useUserData();
  const sv = (key: string) => sectionVisible(user?.settings, "journal", key);
  useEffect(() => { fetchCalendarData(); }, []);
  return (
    <main>
      <JournalHeader />
      <div style={{ padding: "2rem clamp(1rem,3vw,2rem) 0" }}>
        {sv("showAnniversaryBanner") && <AnniversaryBanner />}
        <OnThisDay />
      </div>
      <OurCalendar initialDate={initialDate} />
      {sv("showStreak") && <StreakTracker />}
      {sv("showSurpriseMe") && <SurpriseMe />}
      {sv("showMonthlyRecap") && <MonthlyRecap />}
      <ExportPDF />
    </main>
  );
}

export default function JournalPage() {
  return (
    <PasswordGate>
      <Suspense fallback={null}>
        <JournalContent />
      </Suspense>
    </PasswordGate>
  );
}
