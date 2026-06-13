"use client";
import { useEffect } from "react";
import { fetchCalendarData } from "@/lib/calendarStore";
import PasswordGate from "@/components/PasswordGate";
import MemoryLane   from "@/components/MemoryLane";
import ExportPDF    from "@/components/ExportPDF";

if (typeof window !== "undefined") fetchCalendarData();

export default function MemoriesPage() {
  useEffect(() => { fetchCalendarData(); }, []);
  return (
    <PasswordGate>
      <main>
        <MemoryLane />
        <ExportPDF />
      </main>
    </PasswordGate>
  );
}
