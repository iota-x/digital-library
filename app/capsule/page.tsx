import PasswordGate from "@/components/PasswordGate";
import TimeCapsule  from "@/components/TimeCapsule";

export default function CapsulePage() {
  return (
    <PasswordGate>
      <main>
        <TimeCapsule />
      </main>
    </PasswordGate>
  );
}
