"use client";
import { useEffect } from "react";

/* Restores the saved theme class before any component mounts.
   All visual dark-mode styling is handled purely via CSS (globals.css). */
export default function DarkOverlay() {
  useEffect(() => {
    try {
      if (localStorage.getItem("ann_theme") === "dark") {
        document.documentElement.classList.add("dark");
      }
    } catch {}
  }, []);
  return null;
}
