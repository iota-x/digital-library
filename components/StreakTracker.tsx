"use client";
import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCalendarData } from "@/lib/calendarStore";
import SectionSkeleton from "@/components/SectionSkeleton";

const SERIF = `"Georgia","Times New Roman",serif`;
const SANS  = `var(--font-lato),"Inter",system-ui,sans-serif`;

/* ── palette slot 2: murrey #A10B56 ── */
const BG     = "linear-gradient(170deg,#7a0a40 0%,#a10b56 35%,#8a0a48 70%,#6b0838 100%)";
const SKL_BG = "linear-gradient(160deg,#7a0a40 0%,#a10b56 50%,#7a0a40 100%)";
const ACC    = "#fda4af";
const DIM    = "rgba(253,164,175,0.45)";
const CARD   = "rgba(0,0,0,0.18)";
const RING   = "rgba(253,164,175,0.18)";

export default function StreakTracker() {
  const { data, loading } = useCalendarData();

  const { streak, longest, todayDone } = useMemo(() => {
    const dates = new Set(
      data.filter(e => e.note || (e.photos?.length ?? 0) > 0).map(e => e.date)
    );
    const today = new Date();
    let cur = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      if (dates.has(key)) cur++;
      else if (i > 0) break;
    }
    const sorted = [...dates].sort();
    let max = 0, run = 0, prev: Date | null = null;
    sorted.forEach(k => {
      const d = new Date(k + "T12:00:00");
      if (prev) { const diff = (d.getTime() - prev.getTime()) / 86400000; run = diff === 1 ? run + 1 : 1; }
      else run = 1;
      max = Math.max(max, run); prev = d;
    });
    const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
    return { streak: cur, longest: max, todayDone: dates.has(todayKey) };
  }, [data]);

  const milestones    = [3, 7, 14, 30, 60, 100];
  const nextMilestone = milestones.find(m => m > streak) ?? streak + 10;
  const progress      = Math.min((streak / nextMilestone) * 100, 100);

  if (loading) return (
    <SectionSkeleton
      bg={SKL_BG}
      accent="rgba(253,164,175,0.25)"
      lines={5}
      showHeader
    />
  );

  return (
    <section style={{
      position: "relative", width: "100%", minHeight: "100vh",
      display: "flex", flexDirection: "column", justifyContent: "center",
      padding: "clamp(4rem,8vh,6rem) clamp(1rem,4vw,3rem)",
      background: BG, overflow: "hidden", boxSizing: "border-box",
    }}>
      {/* Blobs */}
      {[
        { t: "8%",  l: "5%",  s: 320, c: "rgba(0,0,0,0.15)" },
        { t: "60%", l: "72%", s: 260, c: "rgba(0,0,0,0.12)" },
        { t: "40%", l: "45%", s: 200, c: "rgba(253,164,175,0.06)" },
      ].map((b, i) => (
        <motion.div key={i}
          animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ repeat: Infinity, duration: 6 + i * 2, ease: "easeInOut" }}
          style={{ position: "absolute", top: b.t, left: b.l, width: b.s, height: b.s,
            borderRadius: "50%", background: b.c, filter: "blur(70px)", pointerEvents: "none" }} />
      ))}

      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
        style={{
          maxWidth: 600, width: "100%", margin: "0 auto", textAlign: "center",
          position: "relative", zIndex: 2,
          display: "flex", flexDirection: "column", gap: "clamp(1.4rem,3vh,2rem)",
        }}>

        {/* Header */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", marginBottom: "0.9rem" }}>
            <div style={{ width: 52, height: 1, background: `linear-gradient(90deg,transparent,${ACC}55)` }} />
            <motion.span style={{ fontSize: "1.8rem", filter: `drop-shadow(0 0 14px ${ACC}88)` }}
              animate={{ scale: [1, 1.22, 1], rotate: [0, 12, -12, 0] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}>🔥</motion.span>
            <div style={{ width: 52, height: 1, background: `linear-gradient(90deg,${ACC}55,transparent)` }} />
          </div>
          <h2 style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "clamp(1.8rem,4vw,2.8rem)",
            color: "#fff5f9", margin: "0 0 0.4rem", fontWeight: 400, textShadow: "0 2px 24px rgba(0,0,0,0.3)" }}>
            our streak
          </h2>
          <p style={{ fontFamily: SANS, fontSize: "clamp(0.85rem,1.5vw,0.95rem)", color: DIM, margin: 0 }}>
            {todayDone ? "✓ memory added today — streak alive 🌸" : "no memory yet today — keep it going!"}
          </p>
        </div>

        {/* Ring + number */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.8, 0.4] }}
              transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut" }}
              style={{ position: "absolute", inset: -20, borderRadius: "50%",
                background: "conic-gradient(from 180deg,#fda4af,#f472b6,#ec4899,#9d174d,#fda4af)",
                filter: "blur(18px)", opacity: 0.4, pointerEvents: "none" }} />
            <motion.div
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              style={{
                position: "relative",
                width: "clamp(155px,20vw,210px)", height: "clamp(155px,20vw,210px)",
                borderRadius: "50%",
                background: "rgba(0,0,0,0.25)",
                border: "2px solid rgba(253,164,175,0.3)",
                backdropFilter: "blur(12px)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                boxShadow: "0 16px 60px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.08)",
              }}>
              <span style={{ fontFamily: SERIF, fontSize: "clamp(3rem,7vw,5rem)",
                color: "#fff5f9", lineHeight: 1, fontWeight: 700 }}>{streak}</span>
              <span style={{ fontFamily: SANS, fontSize: "clamp(0.6rem,1vw,0.72rem)",
                color: DIM, letterSpacing: "0.18em", textTransform: "uppercase", marginTop: "0.15rem" }}>
                day{streak !== 1 ? "s" : ""} in a row
              </span>
            </motion.div>
          </div>
        </div>

        {/* Progress */}
        <div style={{ padding: "0 0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.55rem" }}>
            <span style={{ fontFamily: SANS, fontSize: "0.76rem", color: DIM }}>next: {nextMilestone} days</span>
            <span style={{ fontFamily: SANS, fontSize: "0.76rem", color: ACC, fontWeight: 600 }}>{streak}/{nextMilestone}</span>
          </div>
          <div style={{ height: 7, borderRadius: 4, background: "rgba(0,0,0,0.25)", overflow: "hidden" }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }}
              transition={{ duration: 1.4, ease: "easeOut", delay: 0.3 }}
              style={{ height: "100%", borderRadius: 4,
                background: "linear-gradient(90deg,#fda4af,#f472b6,#ec4899)",
                boxShadow: "0 0 12px rgba(244,114,182,0.6)" }} />
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "clamp(0.6rem,1.5vw,1rem)" }}>
          {[
            { e: "🔥", val: `${streak}`, sub: "current" },
            { e: "⭐", val: `${longest}`, sub: "longest" },
            { e: todayDone ? "✅" : "💭", val: todayDone ? "done!" : "pending", sub: "today" },
          ].map((s, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08, type: "spring", stiffness: 200, damping: 22 }}
              style={{ background: CARD, border: `1px solid ${RING}`, borderRadius: 18,
                padding: "clamp(0.9rem,2.5vh,1.4rem) 0.8rem", textAlign: "center",
                backdropFilter: "blur(10px)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: "clamp(1.4rem,3vw,1.8rem)", marginBottom: "0.4rem" }}>{s.e}</div>
              <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "clamp(1.2rem,2.5vw,1.6rem)",
                color: "#fff5f9", marginBottom: "0.15rem", lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontFamily: SANS, fontSize: "clamp(0.6rem,1vw,0.7rem)", color: DIM,
                textTransform: "uppercase", letterSpacing: "0.12em" }}>{s.sub}</div>
            </motion.div>
          ))}
        </div>

        {/* Badges */}
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
          {milestones.map(m => {
            const done = streak >= m;
            return (
              <motion.div key={m} whileHover={{ scale: 1.08, y: -2 }}
                style={{ padding: "0.32rem 0.9rem", borderRadius: 20,
                  fontFamily: SANS, fontSize: "clamp(0.7rem,1.1vw,0.8rem)", fontWeight: done ? 700 : 400,
                  background: done ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.15)",
                  color: done ? ACC : `${ACC}55`,
                  border: `1px solid ${done ? `${ACC}55` : `${ACC}22`}`,
                  boxShadow: done ? `0 0 14px rgba(253,164,175,0.2)` : "none",
                  transition: "all 0.2s" }}>
                {done ? "🏆 " : ""}{m}d
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}