"use client";
import { useState, useEffect, useCallback } from "react";
import ThemeProvider from "@/components/ThemeProvider";
import SettingsPanel from "@/components/SettingsPanel";

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
      <SettingsPanel open={open} onClose={handleClose} />
    </>
  );
}
