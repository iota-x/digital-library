"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useUserData } from "@/lib/userStore";
import { onSSE } from "@/lib/sseClient";
import { todayKey } from "@/lib/dailyQuestions";
import { SANS } from "@/lib/typography";
import { buzz } from "@/lib/haptics";

/**
 * "Today's question is waiting" nudge.
 *
 * The daily question lives mid-homepage, so it's easy to miss. This slim pill
 * drops in under the navbar the *first time you open the app each day* (only
 * when a partner has joined and you haven't answered yet), then auto-hides
 * after a few seconds and stays gone for the rest of the day. Tapping it jumps
 * straight to the question section.
 *
 * Positioned below the navbar (never over it) so it doesn't cover the nav.
 */

const DISMISS_KEY = "ann_daily_nudge"; // value = the dateKey we've already shown for
const AUTO_HIDE_MS = 9000;

export default function DailyNudge() {
  const user = useUserData();
  const router = useRouter();
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [streak, setStreak] = useState(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const today = todayKey();

  const seal = useCallback(() => {
    try { localStorage.setItem(DISMISS_KEY, today); } catch {}
  }, [today]);

  const dismiss = useCallback(() => {
    setShow(false);
    seal();
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, [seal]);

  // First-open-of-the-day check: only nudge once per day, and only while the
  // question is still unanswered by this user.
  useEffect(() => {
    if (!user?.partnerName) return;
    let cancelled = false;
    (async () => {
      try { if (localStorage.getItem(DISMISS_KEY) === today) return; } catch {}
      try {
        const r = await fetch("/api/daily", { cache: "no-store" });
        const d = (await r.json()) as { question?: string; mine?: string | null; streak?: number };
        if (cancelled || !d || typeof d.question !== "string") return;
        setStreak(typeof d.streak === "number" ? d.streak : 0);
        if (!d.mine) {
          setShow(true);
          hideTimer.current = setTimeout(() => { setShow(false); seal(); }, AUTO_HIDE_MS);
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [user?.partnerName, today, seal]);

  // If the question gets answered/revealed (here or by the partner), drop it.
  useEffect(() => {
    if (!user?.partnerName) return;
    return onSSE((d) => { if (d.type.startsWith("daily:")) dismiss(); });
  }, [user?.partnerName, dismiss]);

  const goAnswer = () => {
    buzz("tap");
    dismiss();
    if (pathname === "/") {
      document.getElementById("daily")?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      router.push("/#daily");
    }
  };

  if (!user?.partnerName) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="daily-nudge"
          initial={{ opacity: 0, y: -22 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -22 }}
          transition={{ type: "spring", stiffness: 240, damping: 22 }}
          style={{
            position: "fixed",
            top: "calc(max(0.7rem, env(safe-area-inset-top)) + 64px)",
            left: "50%", transform: "translateX(-50%)",
            zIndex: 510,
            display: "flex", alignItems: "center", gap: "0.25rem",
            maxWidth: "calc(100vw - 1.5rem)",
          }}
        >
          <motion.button
            onClick={goAnswer}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
            // Soft idle pulse so it reads as a live invitation.
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              background: "linear-gradient(135deg, var(--pink), var(--pink-deep))",
              color: "#fff", border: "none", borderRadius: 50,
              padding: "0.5rem 1rem", cursor: "pointer",
              boxShadow: "0 10px 30px rgba(var(--pink-deep-rgb), .4)",
              fontFamily: SANS, fontSize: "0.78rem", fontWeight: 700,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}
          >
            <span aria-hidden>💭</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
              today&apos;s question is waiting
              {streak > 0 ? ` · 🔥 ${streak}` : ""}
            </span>
            <span aria-hidden style={{ opacity: 0.85 }}>→</span>
          </motion.button>
          <button
            onClick={dismiss}
            aria-label="dismiss"
            style={{
              flexShrink: 0,
              width: 26, height: 26, borderRadius: "50%",
              border: "1px solid rgba(var(--pink-deep-rgb), .3)",
              background: "var(--cream)", color: "var(--pink-deep)",
              cursor: "pointer", fontSize: "0.7rem", lineHeight: 1,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
