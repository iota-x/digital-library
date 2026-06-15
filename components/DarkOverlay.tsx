"use client";
import { useEffect } from "react";

/* Restores dark mode + colour theme before any component mounts (no flash). */
export default function DarkOverlay() {
  useEffect(() => {
    try {
      if (localStorage.getItem("ann_theme") === "dark") {
        document.documentElement.classList.add("dark");
      }
      const colorTheme = localStorage.getItem("ann_color_theme");
      if (colorTheme && colorTheme !== "pink") {
        document.documentElement.classList.add(`theme-${colorTheme}`);
      }
    } catch {}
  }, []);
  return null;
}
