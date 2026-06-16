"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserData } from "@/lib/userStore";
import { SERIF, SANS } from "@/lib/typography";
import { publicEnv } from "@/lib/env";

const VAPID_PUBLIC = publicEnv.VAPID_PUBLIC_KEY;
const STORAGE_KEY = "ann_push_prompt_v1"; // values: "asked" | "later"

function urlBase64ToUint8Array(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

/**
 * Listens for `annapp:push-suggest` events (dispatched by features that just
 * proved they're worth notifications — e.g. a voice note send). If the user
 * hasn't been asked yet and the browser supports it, show a contextual prompt.
 *
 * Why not the toggle in settings? People rarely visit settings. A contextual
 * ask after a meaningful action converts ~3-5× higher.
 */
export default function PushPrompt() {
  const user = useUserData();
  const [visible, setVisible] = useState(false);
  const [reason,  setReason]  = useState<string>("Want notifications when your partner sends you something?");
  const [busy,    setBusy]    = useState(false);
  const cooldownRef = useRef(false);

  useEffect(() => {
    const onSuggest = (e: Event) => {
      if (cooldownRef.current) return;
      if (!user) return;
      if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
      if (Notification.permission === "granted" || Notification.permission === "denied") return;
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === "asked") return;
        // "later" snoozes for 3 days
        if (stored && stored.startsWith("later:")) {
          const until = Number(stored.slice(6));
          if (Date.now() < until) return;
        }
      } catch {}
      const detail = (e as CustomEvent).detail as { reason?: string } | undefined;
      if (detail?.reason) setReason(detail.reason);
      setVisible(true);
      cooldownRef.current = true; // only show once per session
    };
    window.addEventListener("annapp:push-suggest", onSuggest);
    return () => window.removeEventListener("annapp:push-suggest", onSuggest);
  }, [user]);

  const enable = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { try { localStorage.setItem(STORAGE_KEY, "asked"); } catch {}; setVisible(false); return; }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      try { localStorage.setItem(STORAGE_KEY, "asked"); } catch {}
      setVisible(false);
    } catch {
      try { localStorage.setItem(STORAGE_KEY, "asked"); } catch {}
      setVisible(false);
    } finally { setBusy(false); }
  };

  const later = () => {
    const until = Date.now() + 3 * 24 * 60 * 60 * 1000;
    try { localStorage.setItem(STORAGE_KEY, `later:${until}`); } catch {}
    setVisible(false);
  };

  const never = () => {
    try { localStorage.setItem(STORAGE_KEY, "asked"); } catch {}
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
          style={{
            position: "fixed",
            bottom: "max(1.2rem, env(safe-area-inset-bottom))",
            left: "50%", transform: "translateX(-50%)",
            zIndex: 9985,
            width: "min(440px, 92vw)",
            background: "var(--cream)",
            border: "1.5px solid var(--pink-mid)",
            borderRadius: 18,
            padding: "1rem 1.2rem",
            boxShadow: "0 18px 50px rgba(var(--pink-deep-rgb),.25)",
            display: "flex", gap: "0.85rem", alignItems: "center",
          }}
          role="dialog" aria-label="enable notifications"
        >
          <span style={{ fontSize: "1.8rem" }}>🔔</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.95rem", color: "var(--pink-deep)", margin: "0 0 0.15rem", fontWeight: 600 }}>
              get a heads up?
            </p>
            <p style={{ fontFamily: SANS, fontSize: "0.78rem", color: "var(--text)", margin: 0, lineHeight: 1.4 }}>
              {reason}
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", flexShrink: 0 }}>
            <button onClick={enable} disabled={busy}
              style={{
                fontFamily: SANS, fontSize: "0.78rem", fontWeight: 700, color: "#fff",
                background: "linear-gradient(135deg,var(--pink),var(--pink-deep))",
                border: "none", borderRadius: 50, padding: "0.45rem 0.9rem",
                cursor: busy ? "wait" : "pointer", boxShadow: "0 4px 12px rgba(var(--pink-deep-rgb),.3)",
              }}>
              {busy ? "…" : "enable"}
            </button>
            <button onClick={later}
              style={{
                fontFamily: SANS, fontSize: "0.72rem", color: "var(--muted)",
                background: "none", border: "none", cursor: "pointer", padding: 0,
              }}>
              later
            </button>
            <button onClick={never}
              style={{
                fontFamily: SANS, fontSize: "0.66rem", color: "var(--muted)",
                background: "none", border: "none", cursor: "pointer", padding: 0,
                textDecoration: "underline",
              }}>
              no thanks
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
