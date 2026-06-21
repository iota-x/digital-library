"use client";
import { MotionConfig } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { getReduceMotion, UIPREFS_EVENT } from "@/lib/uiPrefs";

export default function MotionRoot({ children }: { children: ReactNode }) {
  // "always" forces framer-motion to skip animations (in-app calm mode); "user"
  // falls back to the OS prefers-reduced-motion setting when the toggle is off.
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const sync = () => setReduce(getReduceMotion());
    sync();
    window.addEventListener(UIPREFS_EVENT, sync);
    return () => window.removeEventListener(UIPREFS_EVENT, sync);
  }, []);
  return <MotionConfig reducedMotion={reduce ? "always" : "user"}>{children}</MotionConfig>;
}
