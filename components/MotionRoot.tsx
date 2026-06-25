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

  // Pause decorative CSS animations while the tab is backgrounded — there's no
  // point compositing petals/orbs/glows nobody is looking at. (framer-motion's
  // rAF loop is already throttled by the browser when hidden; CSS keyframes are
  // not, so they keep the GPU busy until we explicitly pause them.)
  useEffect(() => {
    const onVis = () => document.documentElement.classList.toggle("tab-hidden", document.hidden);
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      document.documentElement.classList.remove("tab-hidden");
    };
  }, []);

  return <MotionConfig reducedMotion={reduce ? "always" : "user"}>{children}</MotionConfig>;
}
