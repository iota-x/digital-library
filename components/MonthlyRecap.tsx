"use client";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCalendarData } from "@/lib/calendarStore";
import SectionSkeleton from "@/components/SectionSkeleton";

const SERIF  = `"Georgia","Times New Roman",serif`;
const SANS   = `var(--font-lato),"Inter",system-ui,sans-serif`;
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MOOD_LABELS: Record<string, string> = {
  "🥰":"loved","😊":"happy","🥺":"soft","😂":"laughing","🌙":"night",
  "💗":"love","✨":"sparkling","🎮":"gaming","🌷":"calm","😴":"sleepy","🤭":"giggly","💫":"dreamy",
};

/* ── palette slot 4: #61063B → #4E0535 → #3B032F ── */
const BG     = "linear-gradient(170deg,#61063b 0%,#4e0535 40%,#3b032f 75%,#2a021f 100%)";
const SKL_BG = "linear-gradient(160deg,#61063b 0%,#4e0535 50%,#3b032f 100%)";
const ACC    = "#f9a8d4";
const DIM    = "rgba(249,168,212,0.38)";
const CARD   = "rgba(0,0,0,0.22)";
const RING   = "rgba(249,168,212,0.12)";
const GRAIN  = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`;

export default function MonthlyRecap() {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [expanded,  setExpanded]  = useState<string | null>(null);
  const [slideDir,  setSlideDir]  = useState<1 | -1>(1);

  const { data, loading } = useCalendarData();

  const entries = useMemo(() => {
    const map: Record<string, typeof data[0]> = {};
    data.forEach(e => { map[e.date] = e; });
    return map;
  }, [data]);

  const prefix       = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
  const monthEntries = useMemo(() => Object.values(entries).filter(e => e.date.startsWith(prefix)), [entries, prefix]);
  const specialDays  = useMemo(() => monthEntries.filter(e => e.special), [monthEntries]);
  const withPhotos   = useMemo(() => monthEntries.filter(e => (e.photos?.length ?? 0) > 0), [monthEntries]);
  const withNotes    = useMemo(() => monthEntries.filter(e => e.note), [monthEntries]);

  const { topMoods, maxMoodCount } = useMemo(() => {
    const moodMap: Record<string, number> = {};
    monthEntries.forEach(e => { if (e.mood) moodMap[e.mood] = (moodMap[e.mood] || 0) + 1; });
    const sorted = Object.entries(moodMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { topMoods: sorted, maxMoodCount: sorted[0]?.[1] ?? 1 };
  }, [monthEntries]);

  const prev = () => { setSlideDir(-1); if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const next = () => { setSlideDir(1);  if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  if (loading) return (
    <SectionSkeleton
      bg={SKL_BG}
      accent="rgba(249,168,212,0.18)"
      lines={6}
      showHeader
    />
  );

  const isEmpty = monthEntries.length === 0;

  return (
    <section style={{
      position: "relative", width: "100%", minHeight: "100vh",
      display: "flex", flexDirection: "column", justifyContent: "center",
      padding: "clamp(4rem,8vh,6rem) clamp(1rem,4vw,3rem)",
      background: BG,
      backgroundImage: `${GRAIN}, ${BG}`,
      overflow: "hidden", boxSizing: "border-box",
    }}>
      {/* Top seam */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: "linear-gradient(90deg,transparent,rgba(249,168,212,0.15),rgba(249,168,212,0.22),rgba(249,168,212,0.15),transparent)" }} />

      {/* Glows */}
      {[
        { t: "10%", l: "4%",  s: 340, c: "rgba(0,0,0,0.2)"         },
        { t: "55%", l: "72%", s: 280, c: "rgba(0,0,0,0.18)"         },
        { t: "30%", l: "40%", s: 200, c: "rgba(249,168,212,0.04)"   },
        { t: "80%", l: "20%", s: 180, c: "rgba(0,0,0,0.15)"         },
      ].map((g, i) => (
        <motion.div key={i}
          animate={{ scale: [1, 1.15, 1], opacity: [0.45, 0.85, 0.45] }}
          transition={{ repeat: Infinity, duration: 8 + i * 2, ease: "easeInOut" }}
          style={{ position: "absolute", top: g.t, left: g.l, width: g.s, height: g.s,
            borderRadius: "50%", background: g.c, filter: "blur(90px)", pointerEvents: "none" }} />
      ))}

      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
        style={{
          maxWidth: 680, width: "100%", margin: "0 auto",
          position: "relative", zIndex: 2,
          display: "flex", flexDirection: "column", gap: "clamp(1.2rem,2.5vh,1.8rem)",
        }}>

        {/* Header */}
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", marginBottom: "0.9rem" }}>
            <div style={{ width: 52, height: 1, background: `linear-gradient(90deg,transparent,${ACC}44)` }} />
            <motion.span style={{ fontSize: "1.8rem" }}
              animate={{ scale: [1, 1.2, 1], rotate: [-5, 5, -5] }}
              transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}>📖</motion.span>
            <div style={{ width: 52, height: 1, background: `linear-gradient(90deg,${ACC}44,transparent)` }} />
          </div>
          <h2 style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "clamp(1.8rem,4vw,2.8rem)",
            color: "#fff5f9", margin: "0 0 0.35rem", fontWeight: 400,
            textShadow: "0 2px 24px rgba(0,0,0,0.35)" }}>
            monthly recap
          </h2>
          <p style={{ fontFamily: SANS, fontSize: "clamp(0.85rem,1.5vw,0.95rem)", color: DIM, margin: 0 }}>
            a little summary of everything we felt 🌸
          </p>
        </div>

        {/* Month nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          background: CARD, borderRadius: 18,
          padding: "clamp(0.8rem,2vh,1.1rem) 1.5rem",
          border: `1px solid ${RING}`,
          backdropFilter: "blur(14px)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.04)" }}>
          <motion.button onClick={prev} whileHover={{ scale: 1.18, x: -2 }} whileTap={{ scale: 0.9 }}
            style={{ background: "none", border: "none", cursor: "pointer",
              fontSize: "1.5rem", color: `${ACC}88`, padding: "0.2rem 0.5rem", lineHeight: 1 }}>‹</motion.button>
          <AnimatePresence mode="wait">
            <motion.div key={`${viewYear}-${viewMonth}`}
              initial={{ opacity: 0, x: slideDir > 0 ? 16 : -16, filter: "blur(4px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: slideDir > 0 ? -16 : 16, filter: "blur(4px)" }}
              transition={{ duration: 0.2 }}
              style={{ textAlign: "center" }}>
              <p style={{ fontFamily: SERIF, fontStyle: "italic",
                fontSize: "clamp(1.3rem,3vw,1.65rem)", color: "#fff5f9", margin: 0, fontWeight: 400 }}>
                {MONTHS[viewMonth]}
              </p>
              <p style={{ fontFamily: SANS, fontSize: "0.78rem", color: DIM, margin: 0 }}>{viewYear}</p>
            </motion.div>
          </AnimatePresence>
          <motion.button onClick={next} whileHover={{ scale: 1.18, x: 2 }} whileTap={{ scale: 0.9 }}
            style={{ background: "none", border: "none", cursor: "pointer",
              fontSize: "1.5rem", color: `${ACC}88`, padding: "0.2rem 0.5rem", lineHeight: 1 }}>›</motion.button>
        </div>

        {/* Empty */}
        {isEmpty ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: "center", padding: "clamp(2rem,6vh,4rem) 1rem",
              display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
            <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ repeat: Infinity, duration: 3 }}
              style={{ fontSize: "2.5rem" }}>🌙</motion.div>
            <p style={{ fontFamily: SANS, fontSize: "0.92rem", color: "rgba(249,168,212,0.25)", margin: 0 }}>
              no memories logged for {MONTHS[viewMonth]} yet
            </p>
          </motion.div>
        ) : (
          <>
            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "clamp(0.55rem,1.5vw,0.85rem)" }}>
              {[
                { e: "📅", val: monthEntries.length, label: "days"    },
                { e: "⭐", val: specialDays.length,  label: "special"  },
                { e: "📸", val: withPhotos.length,   label: "photos"   },
                { e: "📝", val: withNotes.length,    label: "notes"    },
              ].map((s, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, type: "spring", stiffness: 180, damping: 20 }}
                  style={{ background: CARD, border: `1px solid ${RING}`, borderRadius: 18,
                    padding: "clamp(0.85rem,2.5vh,1.3rem) clamp(0.4rem,1.5vw,0.8rem)",
                    textAlign: "center", backdropFilter: "blur(16px)",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.04)" }}>
                  <div style={{ fontSize: "clamp(1.2rem,2.5vw,1.5rem)", marginBottom: "0.35rem" }}>{s.e}</div>
                  <div style={{ fontFamily: SERIF, fontStyle: "italic",
                    fontSize: "clamp(1.3rem,3vw,1.75rem)", color: ACC, lineHeight: 1, marginBottom: "0.12rem" }}>{s.val}</div>
                  <div style={{ fontFamily: SANS, fontSize: "clamp(0.58rem,0.9vw,0.68rem)", color: DIM,
                    textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.label}</div>
                </motion.div>
              ))}
            </div>

            {/* Mood chart */}
            {topMoods.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                style={{ background: CARD, border: `1px solid ${RING}`, borderRadius: 22,
                  padding: "clamp(1rem,2.5vh,1.5rem)", backdropFilter: "blur(16px)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.04)" }}>
                <p style={{ fontFamily: SANS, fontSize: "0.7rem", color: DIM,
                  letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 1.1rem" }}>mood breakdown</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  {topMoods.map(([mood, count]) => (
                    <div key={mood} style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                      <span style={{ fontSize: "clamp(1.1rem,2.5vw,1.4rem)", width: 32, textAlign: "center", flexShrink: 0 }}>{mood}</span>
                      <div style={{ flex: 1, height: 8, borderRadius: 4,
                        background: "rgba(0,0,0,0.25)", overflow: "hidden" }}>
                        <motion.div
                          initial={{ width: 0 }} animate={{ width: `${(count / maxMoodCount) * 100}%` }}
                          transition={{ duration: 1.1, ease: "easeOut", delay: 0.15 }}
                          style={{ height: "100%", borderRadius: 4,
                            background: `linear-gradient(90deg,${ACC}aa,#ec4899)`,
                            boxShadow: "0 0 10px rgba(236,72,153,0.35)" }} />
                      </div>
                      <span style={{ fontFamily: SANS, fontSize: "0.74rem", color: `${ACC}66`, minWidth: 18, textAlign: "right" }}>{count}</span>
                      <span style={{ fontFamily: SANS, fontSize: "0.68rem", color: `${ACC}44`, minWidth: 56 }}>{MOOD_LABELS[mood] || ""}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Special days */}
            {specialDays.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                style={{ background: CARD, border: `1px solid ${RING}`, borderRadius: 22,
                  padding: "clamp(1rem,2.5vh,1.5rem)", backdropFilter: "blur(16px)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.04)" }}>
                <p style={{ fontFamily: SANS, fontSize: "0.7rem", color: DIM,
                  letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 1rem" }}>special days this month</p>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {specialDays.map((e, idx) => {
                    const dd = new Date(e.date + "T12:00:00");
                    const isOpen = expanded === e.date;
                    return (
                      <div key={e.date}
                        style={{ borderBottom: idx < specialDays.length - 1 ? `1px solid ${RING}` : "none" }}>
                        <motion.div whileHover={{ x: 4 }}
                          onClick={() => setExpanded(isOpen ? null : e.date)}
                          style={{ display: "flex", alignItems: "center", gap: "0.8rem",
                            cursor: "pointer", padding: "0.68rem 0" }}>
                          <span style={{ fontSize: "1rem", flexShrink: 0 }}>⭐</span>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontFamily: SERIF, fontStyle: "italic",
                              fontSize: "0.96rem", color: "rgba(255,245,249,0.82)" }}>
                              {dd.getDate()} {MONTHS[dd.getMonth()]}
                            </span>
                            {e.specialLabel && (
                              <span style={{ fontFamily: SANS, fontSize: "0.73rem",
                                color: `${ACC}55`, marginLeft: "0.5rem" }}>{e.specialLabel}</span>
                            )}
                          </div>
                          {e.mood && <span style={{ fontSize: "1rem" }}>{e.mood}</span>}
                          <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}
                            style={{ color: `${ACC}33`, fontSize: "0.72rem", flexShrink: 0 }}>▼</motion.span>
                        </motion.div>
                        <AnimatePresence>
                          {isOpen && e.note && (
                            <motion.p
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.22 }}
                              style={{ fontFamily: SERIF, fontSize: "0.88rem",
                                color: "rgba(249,168,212,0.45)", lineHeight: 1.85,
                                margin: "0 0 0.7rem 1.85rem", overflow: "hidden", fontStyle: "italic" }}>
                              {e.note.slice(0, 200)}{e.note.length > 200 ? "…" : ""}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* Closing ornament */}
        <div style={{ textAlign: "center", paddingTop: "0.5rem" }}>
          <motion.span
            animate={{ scale: [1, 1.14, 1], opacity: [0.25, 0.55, 0.25] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
            style={{ fontSize: "1.1rem" }}>🌸</motion.span>
          <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.78rem",
            color: "rgba(249,168,212,0.18)", marginTop: "0.5rem", letterSpacing: "0.06em" }}>
            every day with you is worth remembering
          </p>
        </div>
      </motion.div>
    </section>
  );
}