"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useCalendarData } from "@/lib/calendarStore";
import { useUserData } from "@/lib/userStore";
import { todayDayNumber } from "@/lib/relationship";
import SectionSkeleton from "@/components/SectionSkeleton";
import { SERIF, SANS } from "@/lib/typography";

/**
 * "Us by the numbers" — one panel that gathers the stats otherwise scattered
 * across the app (days together, memories, photos, both streaks, top mood)
 * into a single glanceable dashboard.
 */

const MOOD_LABEL: Record<string, string> = {
  "🥰":"loved","😊":"happy","🥺":"soft","😂":"laughing","🌙":"moonlit",
  "💗":"love","✨":"sparkling","🎮":"gaming","🌷":"peaceful","😴":"sleepy","🤭":"giggly","💫":"dreamy",
};

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export default function UsByNumbers() {
  const { data, loading } = useCalendarData();
  const user = useUserData();
  const [dailyStreak, setDailyStreak] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.partnerName) return;
    let cancelled = false;
    fetch("/api/daily", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (!cancelled && typeof d?.streak === "number") setDailyStreak(d.streak); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?.partnerName]);

  const stats = useMemo(() => {
    const withContent = data.filter((e) => e.note || (e.photos?.length ?? 0) > 0);
    const memories = withContent.length;
    const photos = data.reduce((sum, e) => sum + (e.photos?.length ?? 0), 0);

    // Journal streak — consecutive days back from today with a memory.
    const dateSet = new Set(withContent.map((e) => e.date));
    let journalStreak = 0;
    const cur = new Date();
    if (!dateSet.has(dayKey(cur))) cur.setDate(cur.getDate() - 1); // grace for today
    while (dateSet.has(dayKey(cur))) { journalStreak++; cur.setDate(cur.getDate() - 1); }

    // Top mood.
    const moodCount: Record<string, number> = {};
    data.forEach((e) => { if (e.mood) moodCount[e.mood] = (moodCount[e.mood] || 0) + 1; });
    const top = Object.entries(moodCount).sort((a, b) => b[1] - a[1])[0];
    const topMood = top ? top[0] : null;

    return { memories, photos, journalStreak, topMood };
  }, [data]);

  if (loading) return <SectionSkeleton accent="rgba(var(--pink-rgb),.22)" lines={4} />;

  const days = todayDayNumber(user?.startDate);
  const cards: { emoji: string; value: string; label: string }[] = [
    { emoji: "💞", value: days.toLocaleString(), label: "days together" },
    { emoji: "📖", value: String(stats.memories), label: "memories kept" },
    { emoji: "📸", value: String(stats.photos), label: "photos saved" },
    { emoji: "🔥", value: `${stats.journalStreak}d`, label: "journal streak" },
  ];
  if (dailyStreak !== null) cards.push({ emoji: "💭", value: `${dailyStreak}d`, label: "answer streak" });
  if (stats.topMood) cards.push({ emoji: stats.topMood, value: MOOD_LABEL[stats.topMood] ?? "—", label: "top mood" });

  return (
    <section id="us-by-numbers" style={{
      position: "relative", width: "100%",
      padding: "clamp(3rem,7vh,5rem) clamp(1rem,4vw,2.5rem)",
      display: "flex", justifyContent: "center",
    }}>
      <div style={{ width: "100%", maxWidth: 640, textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", marginBottom: "0.8rem" }}>
          <div style={{ width: 50, height: 1, background: "linear-gradient(90deg,transparent,rgba(var(--pink-rgb),.4))" }} />
          <span style={{ fontSize: "1.5rem" }}>✨</span>
          <div style={{ width: 50, height: 1, background: "linear-gradient(90deg,rgba(var(--pink-rgb),.4),transparent)" }} />
        </div>
        <h2 style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 400,
          fontSize: "clamp(1.8rem,5vw,2.6rem)", color: "var(--pink-deep)", margin: "0 0 1.8rem" }}>
          us by the numbers
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.8rem" }}>
          {cards.map((c, i) => (
            <motion.div key={c.label}
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.06 }} whileHover={{ y: -3, scale: 1.03 }}
              style={{
                background: "var(--cream)", border: "1px solid rgba(var(--pink-rgb),.22)",
                borderRadius: 20, padding: "1.3rem 0.6rem",
                boxShadow: "0 4px 18px rgba(var(--pink-deep-rgb),.08)",
              }}>
              <div style={{ fontSize: "1.6rem", marginBottom: "0.4rem" }}>{c.emoji}</div>
              <div style={{ fontFamily: SERIF, fontSize: "clamp(1.5rem,4vw,2rem)", color: "var(--pink-deep)", lineHeight: 1, marginBottom: "0.35rem", fontWeight: 700 }}>
                {c.value}
              </div>
              <div style={{ fontFamily: SANS, fontSize: "0.66rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {c.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
