import PasswordGate from "@/components/PasswordGate";
import Timeline     from "@/components/Timeline";
import Final        from "@/components/Final";
import MoodGraph from "@/components/MoodGraph";

export default function TimelinePage() {
  return (
    <PasswordGate>
      <main>
        <Timeline />
        <MoodGraph />
      </main>
    </PasswordGate>
  );
}