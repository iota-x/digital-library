"use client";
import { useEffect, useState } from "react";

export default function DarkOverlay() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const sync = () => setDark(document.documentElement.classList.contains("dark"));
    // restore saved preference
    const saved = localStorage.getItem("ann_theme");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
    }
    sync();
    window.addEventListener("annapp:theme", sync);
    return () => window.removeEventListener("annapp:theme", sync);
  }, []);

  if (!dark) return null;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 3000,
        background: "rgba(8, 1, 5, 0.58)",
        pointerEvents: "none",
      }}
    />
  );
}
