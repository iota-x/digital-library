"use client";
import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js")
      .then(reg => {
        // Force the browser to check for a new sw.js on every load
        reg.update().catch(() => {});

        const activate = (worker: ServiceWorker) => {
          worker.postMessage({ type: "SKIP_WAITING" });
        };
        // If a new worker is already waiting, activate it now
        if (reg.waiting) activate(reg.waiting);
        reg.addEventListener("updatefound", () => {
          const w = reg.installing;
          if (!w) return;
          w.addEventListener("statechange", () => {
            if (w.state === "installed") activate(w);
          });
        });
      })
      .catch(() => {});
  }, []);
  return null;
}
