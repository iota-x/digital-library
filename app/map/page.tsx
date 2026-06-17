"use client";
import { useEffect } from "react";
import { fetchCalendarData } from "@/lib/calendarStore";
import PasswordGate from "@/components/PasswordGate";
import MemoryLane   from "@/components/MemoryLane";
import MemoryMap    from "@/components/MemoryMap";
import ExportPDF    from "@/components/ExportPDF";
import { SERIF, SCRIPT } from "@/lib/typography";

if (typeof window !== "undefined") fetchCalendarData();

export default function MemoriesPage() {
  useEffect(() => { fetchCalendarData(); }, []);
  return (
    <PasswordGate>
      <main>
        <MemoryLane />

        {/* Places we've been — geographic pin map */}
        <section style={{ padding: "clamp(3rem,7vh,5rem) clamp(1rem,4vw,2.5rem) 1.5rem", textAlign: "center" }}>
          <h2 style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 400,
            fontSize: "clamp(2rem,5vw,2.8rem)", color: "var(--pink-deep)", margin: "0 0 0.4rem" }}>
            places we&apos;ve been
          </h2>
          <p style={{ fontFamily: SCRIPT, fontSize: "clamp(1rem,2.5vw,1.2rem)", color: "rgba(var(--pink-deep-rgb),.45)", margin: 0 }}>
            tap the map to pin a place that&apos;s ours 💗
          </p>
        </section>
        <MemoryMap />

        <ExportPDF />
      </main>
    </PasswordGate>
  );
}
