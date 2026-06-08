import PasswordGate  from "@/components/PasswordGate";
import TimeCapsule   from "@/components/TimeCapsule";
import ExportPDF     from "@/components/ExportPDF";
import Final         from "@/components/Final";

export default function CapsulePage() {
  return (
    <PasswordGate>
      <main>
        <TimeCapsule />
        <ExportPDF />
      </main>
    </PasswordGate>
  );
}