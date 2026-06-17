"use client";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserData } from "@/lib/userStore";
import { SANS } from "@/lib/typography";

/**
 * Gentle in-app countdown banner for an upcoming anniversary or birthday
 * (within a week). The push side (server) covers the app-closed case; this is
 * the at-a-glance counterpart when the home page opens. Dismissible per
 * occasion-year so it shows at most once until the next milestone.
 */

const WITHIN_DAYS = 7;
const DISMISS_PREFIX = "ann_date_reminder_";

// Ankit + Juhi baked-in birthdays (mirrors BirthdayTakeover) so the personal
// build works without anyone filling in settings.
const ANKIT_JUHI_BDAYS: Record<string, string> = { ankit: "12-20", juhi: "07-06" };

function daysUntilMMDD(mmdd: string): { days: number; targetYear: number } | null {
  const [m, d] = mmdd.split("-").map(Number);
  if (!m || !d) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let year = now.getFullYear();
  let target = new Date(year, m - 1, d);
  if (target < today) { year += 1; target = new Date(year, m - 1, d); }
  return { days: Math.round((target.getTime() - today.getTime()) / 86_400_000), targetYear: year };
}

interface Occasion { type: string; days: number; targetYear: number; emoji: string; text: string; }

export default function DateReminders() {
  const user = useUserData();
  const [dismissed, setDismissed] = useState(false);

  const occasion = useMemo<Occasion | null>(() => {
    if (!user) return null;
    const candidates: Occasion[] = [];

    const push = (type: string, mmdd: string | undefined | null, emoji: string, make: (d: number) => string) => {
      if (!mmdd) return;
      const u = daysUntilMMDD(mmdd);
      if (u && u.days <= WITHIN_DAYS) candidates.push({ type, days: u.days, targetYear: u.targetYear, emoji, text: make(u.days) });
    };

    // Anniversary from the couple's start date.
    if (user.startDate && user.startDate.length >= 10) {
      const startYear = Number(user.startDate.slice(0, 4));
      push("anniversary", user.startDate.slice(5), "💍", (d) => {
        const years = (daysUntilMMDD(user.startDate.slice(5))?.targetYear ?? 0) - startYear;
        const label = years > 0 ? `your ${years}-year anniversary` : "your anniversary";
        return d === 0 ? `happy anniversary 💞 — ${label.replace("your ", "")}` : `${label} is ${d === 1 ? "tomorrow" : `in ${d} days`}`;
      });
    }

    // Birthdays — baked for Ankit/Juhi, else from settings.
    const nameLower = (user.name || "").trim().toLowerCase();
    const partnerLower = (user.partnerName || "").trim().toLowerCase();
    const s = user.settings as unknown as Record<string, unknown>;
    const myBday      = ANKIT_JUHI_BDAYS[nameLower]    ?? (typeof s?.userBirthday    === "string" ? s.userBirthday    : null);
    const partnerBday = ANKIT_JUHI_BDAYS[partnerLower] ?? (typeof s?.partnerBirthday === "string" ? s.partnerBirthday : null);
    const firstName = (n: string | null) => (n || "").trim().split(" ")[0];

    push("bday-partner", partnerBday, "🎂", (d) =>
      d === 0 ? `it's ${firstName(user.partnerName) || "their"} birthday today 🎉` : `${firstName(user.partnerName) || "their"}'s birthday is ${d === 1 ? "tomorrow" : `in ${d} days`}`);
    push("bday-me", myBday, "🎂", (d) =>
      d === 0 ? `it's your birthday today 🎉` : `your birthday is ${d === 1 ? "tomorrow" : `in ${d} days`}`);

    // Soonest wins.
    candidates.sort((a, b) => a.days - b.days);
    return candidates[0] ?? null;
  }, [user]);

  if (!occasion || dismissed) return null;

  const dismissKey = `${DISMISS_PREFIX}${occasion.type}_${occasion.targetYear}`;
  try { if (typeof window !== "undefined" && localStorage.getItem(dismissKey) === "1") return null; } catch {}

  const dismiss = () => {
    try { localStorage.setItem(dismissKey, "1"); } catch {}
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem",
          margin: "0.8rem auto 0", maxWidth: 620,
          padding: "0.55rem 0.7rem 0.55rem 1.1rem",
          background: "linear-gradient(135deg, rgba(var(--pink-rgb),.18), rgba(var(--pink-deep-rgb),.12))",
          border: "1px solid rgba(var(--pink-deep-rgb),.28)",
          borderRadius: 50,
        }}
      >
        <span aria-hidden style={{ fontSize: "1.1rem" }}>{occasion.emoji}</span>
        <span style={{ fontFamily: SANS, fontSize: "0.82rem", fontWeight: 700, color: "var(--pink-deep)", textAlign: "center" }}>
          {occasion.text}
        </span>
        <button onClick={dismiss} aria-label="dismiss reminder"
          style={{
            flexShrink: 0, width: 24, height: 24, borderRadius: "50%",
            border: "1px solid rgba(var(--pink-deep-rgb),.25)", background: "transparent",
            color: "var(--pink-deep)", cursor: "pointer", fontSize: "0.7rem", lineHeight: 1,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
      </motion.div>
    </AnimatePresence>
  );
}
