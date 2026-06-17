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
import DaysBadge             from "@/components/DaysBadge";

export default function AppShell() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("annapp:settings", handler);
    return () => window.removeEventListener("annapp:settings", handler);
  }, []);

  const handleClose = useCallback(() => setOpen(false), []);

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
      <DaysBadge />
      <SettingsPanel open={open} onClose={handleClose} />
    </>
  );
}
