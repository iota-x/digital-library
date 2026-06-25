"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserData, displayName, partnerDisplayName } from "@/lib/userStore";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { SERIF, SCRIPT, SANS } from "@/lib/typography";
import { chime, buzz } from "@/lib/haptics";

/**
 * Once-a-year full-screen celebration that fires on a birthday.
 *
 * For Ankit + Juhi these dates are baked in (Dec 20 / Jul 6). For other
 * couples the birthdays live in `settings.userBirthday` / `partnerBirthday`
 * (MM-DD strings) — if unset, this component renders nothing.
 *
 * Persistence: a localStorage key per-year-per-person ensures the takeover
 * only fires once per calendar visit. Closing it stores the marker; the
 * next time that same day is visited within the same year, nothing
 * happens. New year, fresh celebration.
 */
const ANKIT_JUHI_BIRTHDAYS: Record<string, { who: "you" | "them"; name: string }> = {
  "12-20": { who: "you",  name: "Ankit" },  // shown to Ankit as "your birthday"
  "07-06": { who: "them", name: "Juhi" },
};

const STORAGE_KEY = "ann_bday_seen_v1";

function todayKey(): string {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function yearKey(monthDay: string): string {
  return `${new Date().getFullYear()}-${monthDay}`;
}

function isAnkitJuhi(name?: string|null, partner?: string|null): boolean {
  const ns = [name?.trim().toLowerCase(), partner?.trim().toLowerCase()];
  return ns.includes("ankit") && ns.includes("juhi");
}

interface CelebrationTarget {
  forName: string;   // who the takeover is about ("Juhi")
  isSelf:  boolean;  // whose birthday is it relative to the viewing user
}

export default function BirthdayTakeover() {
  const userData = useUserData();
  const [visible, setVisible] = useState(false);
  const [target, setTarget] = useState<CelebrationTarget | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Compute today's celebration target (if any) based on saved settings
  const candidate = useMemo<CelebrationTarget | null>(() => {
    if (!userData) return null;
    const md = todayKey();

    // 1) Ankit + Juhi — use baked-in dates so the personal version Just Works
    if (isAnkitJuhi(userData.name, userData.partnerName)) {
      const hit = ANKIT_JUHI_BIRTHDAYS[md];
      if (!hit) return null;
      // hit.who is from Ankit's perspective; flip if viewer is Juhi
      const viewerIsAnkit = userData.name?.trim().toLowerCase() === "ankit";
      const forName = hit.name;
      const isSelf  = viewerIsAnkit ? hit.who === "you" : hit.who === "them";
      return { forName, isSelf };
    }

    // 2) Generic — settings.userBirthday / partnerBirthday (MM-DD)
    const s = userData.settings as unknown as Record<string, unknown>;
    const me  = typeof s?.userBirthday    === "string" ? s.userBirthday    : null;
    const them = typeof s?.partnerBirthday === "string" ? s.partnerBirthday : null;
    if (me === md)   return { forName: displayName(userData) || "you",                isSelf: true  };
    if (them === md) return { forName: partnerDisplayName(userData) || "your love",   isSelf: false };
    return null;
  }, [userData]);

  useEffect(() => {
    if (!candidate) return;
    const key = yearKey(todayKey());
    let seen: string[] = [];
    try { seen = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch {}
    if (seen.includes(key)) return;
    setTarget(candidate);
    // Tiny delay so it doesn't feel like the page assault-opens on the user
    const t = setTimeout(() => {
      setVisible(true);
      chime(0.22);
      buzz("double");
    }, 700);
    return () => clearTimeout(t);
  }, [candidate]);

  const dismiss = () => {
    setVisible(false);
    try {
      const key = yearKey(todayKey());
      const seen: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!seen.includes(key)) seen.push(key);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seen));
    } catch {}
  };

  useFocusTrap(dialogRef, { active: visible, onEscape: dismiss });

  return (
    <AnimatePresence>
      {visible && target && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={dismiss}
          style={{
            position: "fixed", inset: 0, zIndex: 9994,
            display: "flex", alignItems: "center", justifyContent: "center",
            background:
              "radial-gradient(circle at 30% 20%, rgba(var(--pink-rgb),0.35), transparent 55%)," +
              "radial-gradient(circle at 70% 80%, rgba(var(--pink-deep-rgb),0.32), transparent 60%)," +
              "rgba(15, 0, 12, 0.88)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            padding: "2rem",
          }}>
          {/* Confetti / petals */}
          {Array.from({ length: 36 }).map((_, i) => (
            <motion.span
              key={i}
              aria-hidden
              initial={{ x: `${(i * 7.3) % 100}vw`, y: "-10vh", opacity: 0, rotate: 0 }}
              animate={{ y: "110vh", opacity: [0, 1, 1, 0], rotate: 360 + (i % 3) * 180 }}
              transition={{ duration: 4 + (i % 4) * 1.3, repeat: Infinity, delay: (i * 0.13) % 3.2, ease: "linear" }}
              style={{
                position: "absolute",
                top: 0, left: 0,
                fontSize: i % 5 === 0 ? "1.8rem" : "1.2rem",
                pointerEvents: "none",
                userSelect: "none",
              }}>
              {["🌸", "💗", "🎀", "🩷", "💕", "🌷"][i % 6]}
            </motion.span>
          ))}

          <motion.div
            ref={dialogRef}
            initial={{ scale: 0.85, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            onClick={e => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-labelledby="bday-title"
            style={{
              position: "relative",
              background: "linear-gradient(160deg, var(--cream) 0%, rgba(var(--pink-light-rgb), .55) 100%)",
              border: "1.5px solid rgba(var(--pink-rgb), .45)",
              borderRadius: 28,
              padding: "clamp(2rem, 5vw, 3rem)",
              maxWidth: 520, width: "100%",
              textAlign: "center",
              boxShadow: "0 40px 100px rgba(var(--pink-deep-rgb), .35)",
            }}
          >
            <motion.div
              animate={{ rotate: [-8, 8, -8] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              aria-hidden style={{ fontSize: "4rem", marginBottom: "0.4rem", display: "inline-block" }}>
              🎂
            </motion.div>
            <p style={{
              fontFamily: SCRIPT, fontSize: "1.1rem",
              color: "var(--pink-deep)", letterSpacing: "0.06em", margin: "0 0 0.4rem",
            }}>
              {target.isSelf ? "today is your day" : `today is ${target.forName}'s day`}
            </p>
            <h2 id="bday-title" style={{
              fontFamily: SERIF, fontStyle: "italic",
              fontSize: "clamp(1.9rem, 5vw, 2.7rem)",
              color: "var(--pink-deep)", margin: "0 0 0.7rem", fontWeight: 400,
              lineHeight: 1.15,
            }}>
              {target.isSelf
                ? `happy birthday, ${target.forName} 🌸`
                : `happy birthday, ${target.forName} 💗`}
            </h2>
            <p style={{
              fontFamily: SERIF, fontStyle: "italic",
              fontSize: "clamp(0.95rem, 2.5vw, 1.05rem)",
              color: "var(--text)", lineHeight: 1.6, margin: "0 0 1.6rem",
              opacity: 0.85,
            }}>
              {target.isSelf
                ? "the whole world is yours today. make it gentle, make it loud, make it yours. we're glad you exist 🌷"
                : `take a moment. send them a voice note, write them a letter, tell them you love them. they made the world softer just by being here 🩷`}
            </p>
            <motion.button
              onClick={dismiss}
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              style={{
                fontFamily: SANS, fontSize: "0.9rem", fontWeight: 700,
                color: "#fff",
                background: "linear-gradient(135deg, var(--pink), var(--pink-deep))",
                border: "none", borderRadius: 50,
                padding: "0.75rem 1.7rem", cursor: "pointer",
                boxShadow: "0 8px 24px rgba(var(--pink-deep-rgb), .35)",
              }}>
              {target.isSelf ? "thank you 💗" : "noted 💌"}
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
