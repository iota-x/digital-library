"use client";
import { useState, useEffect, useCallback } from "react";
import ThemeProvider         from "@/components/ThemeProvider";
import SettingsPanel         from "@/components/SettingsPanel";
import MilestoneCelebration  from "@/components/MilestoneCelebration";
import ShortcutSheet         from "@/components/ShortcutSheet";
import Onboarding            from "@/components/Onboarding";
import PushPrompt            from "@/components/PushPrompt";
import BirthdayTakeover      from "@/components/BirthdayTakeover";
import PresenceLayer         from "@/components/PresenceLayer";
import NudgeLayer            from "@/components/NudgeLayer";
import TogetherMode          from "@/components/TogetherMode";
import DailyNudge            from "@/components/DailyNudge";
import DaysBadge             from "@/components/DaysBadge";

export default function AppShell() {
  const [open, setOpen] = useState(false);
  const [focusField, setFocusField] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      setFocusField((e as CustomEvent).detail?.focus ?? null);
      setOpen(true);
    };
    window.addEventListener("annapp:settings", handler);
    return () => window.removeEventListener("annapp:settings", handler);
  }, []);

  const handleClose = useCallback(() => { setOpen(false); setFocusField(null); }, []);

  return (
    <>
      <ThemeProvider />
      <MilestoneCelebration />
      <Onboarding />
      <PushPrompt />
      <ShortcutSheet />
      <BirthdayTakeover />
      <PresenceLayer />
      <NudgeLayer />
      <TogetherMode />
      <DailyNudge />
      <DaysBadge />
      <SettingsPanel open={open} onClose={handleClose} focusField={focusField} />
    </>
  );
}
