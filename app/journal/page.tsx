import PasswordGate   from "@/components/PasswordGate";
import OurCalendar    from "@/components/OurCalendar";
import StreakTracker  from "@/components/StreakTracker";
import SurpriseMe    from "@/components/SurpriseMe";
import MonthlyRecap  from "@/components/MonthlyRecap";
import Final         from "@/components/Final";

export default function JournalPage() {
  return (
    <PasswordGate>
      <main>
        <OurCalendar />
        <StreakTracker />
        <SurpriseMe />
        <MonthlyRecap />
      </main>
    </PasswordGate>
  );
}