import PasswordGate  from "@/components/PasswordGate";
import Polaroids     from "@/components/Polaroids";
import LiveTimer     from "@/components/LiveTimer";
import MemoryCards   from "@/components/MemoryCards";
import ButtonSection from "@/components/ButtonSection";
import VoiceNote     from "@/components/VoiceNote";
import Final         from "@/components/Final";

export default function Home() {
  return (
    <PasswordGate>
      <main>
        <Polaroids />
        <LiveTimer />
        <MemoryCards />
        <ButtonSection />
        <VoiceNote />
        <Final />
      </main>
    </PasswordGate>
  );
}