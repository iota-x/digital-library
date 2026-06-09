"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCalendarData, CalEntry } from "@/lib/calendarStore";

const SERIF  = `"Georgia","Times New Roman",serif`;
const SANS   = `var(--font-lato),"Inter",system-ui,sans-serif`;
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const START  = new Date("2026-03-11");

function dayNum(key: string) {
  return Math.floor((new Date(key + "T12:00:00").getTime() - START.getTime()) / 86400000) + 1;
}

/* ── palette slot 3: #7E0B48 ── */
const BG   = "linear-gradient(170deg,#a10b56 0%,#7e0b48 30%,#61063b 65%,#4e0535 100%)";
const ACC  = "#fda4af";
const GRAIN = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E")`;

export default function SurpriseMe() {
  const { data } = useCalendarData(); // no loading spinner needed — data already in cache from calendar
  const entries = data.filter(e => e.note || (e.photos?.length ?? 0) > 0);

  const [shown,    setShown]    = useState<CalEntry | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [imgIdx,   setImgIdx]   = useState(0);
  const spinRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const spin = () => {
    if (!entries.length || spinning) return;
    setSpinning(true); setShown(null);
    let i = 0;
    const flicker = () => {
      setShown(entries[Math.floor(Math.random() * entries.length)]);
      i++;
      if (i < 9) spinRef.current = setTimeout(flicker, 70 + i * 28);
      else {
        setShown(entries[Math.floor(Math.random() * entries.length)]);
        setImgIdx(0); setSpinning(false);
      }
    };
    flicker();
  };

  const d  = shown ? new Date(shown.date + "T12:00:00") : null;
  const dn = shown ? dayNum(shown.date) : null;

  return (
    <section style={{
      position: "relative", width: "100%", minHeight: "100vh",
      display: "flex", flexDirection: "column", justifyContent: "center",
      padding: "clamp(4rem,8vh,6rem) clamp(1rem,4vw,3rem)",
      background: BG,
      backgroundImage: `${GRAIN}, ${BG}`,
      overflow: "hidden", boxSizing: "border-box",
    }}>
      {/* Top seam — matches StreakTracker bottom */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: "linear-gradient(90deg,transparent,rgba(253,164,175,0.2),rgba(253,164,175,0.3),rgba(253,164,175,0.2),transparent)" }} />

      {/* Glows */}
      {[
        { t: "15%", l: "8%",  s: 300, c: "rgba(0,0,0,0.2)"         },
        { t: "55%", l: "70%", s: 260, c: "rgba(0,0,0,0.18)"         },
        { t: "35%", l: "40%", s: 180, c: "rgba(253,164,175,0.05)"   },
      ].map((g, i) => (
        <motion.div key={i}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 7 + i * 2, ease: "easeInOut" }}
          style={{ position: "absolute", top: g.t, left: g.l, width: g.s, height: g.s,
            borderRadius: "50%", background: g.c, filter: "blur(80px)", pointerEvents: "none" }} />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        style={{
          maxWidth: 600, width: "100%", margin: "0 auto", textAlign: "center",
          position: "relative", zIndex: 2,
          display: "flex", flexDirection: "column", gap: "clamp(1.4rem,3vh,2rem)",
        }}>

        {/* Header */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", marginBottom: "0.9rem" }}>
            <div style={{ width: 52, height: 1, background: `linear-gradient(90deg,transparent,${ACC}44)` }} />
            <motion.span style={{ fontSize: "1.8rem" }}
              animate={{ rotate: [0, 22, -22, 0], scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}>✨</motion.span>
            <div style={{ width: 52, height: 1, background: `linear-gradient(90deg,${ACC}44,transparent)` }} />
          </div>
          <h2 style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "clamp(1.8rem,4vw,2.8rem)",
            color: "#fff5f9", margin: "0 0 0.4rem", fontWeight: 400,
            textShadow: "0 2px 24px rgba(0,0,0,0.35)" }}>
            surprise me
          </h2>
          <p style={{ fontFamily: SANS, fontSize: "clamp(0.85rem,1.5vw,0.95rem)",
            color: "rgba(253,164,175,0.5)", margin: 0 }}>
            relive a random memory from our time together 🌸
          </p>
        </div>

        {/* Button */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <motion.button onClick={spin} disabled={spinning || !entries.length}
            whileHover={{ scale: 1.06, y: -3 }} whileTap={{ scale: 0.96 }}
            animate={spinning ? { rotate: [0, 5, -5, 4, -4, 0] } : {}}
            transition={spinning ? { repeat: Infinity, duration: 0.28 } : { type: "spring", stiffness: 200 }}
            style={{
              padding: "clamp(0.9rem,2vh,1.15rem) clamp(2rem,4vw,2.8rem)",
              borderRadius: 50, cursor: (!entries.length || spinning) ? "not-allowed" : "pointer",
              background: spinning ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.3)",
              border: `1.5px solid ${ACC}44`,
              backdropFilter: "blur(14px)",
              color: "#fff5f9", fontFamily: SERIF, fontStyle: "italic",
              fontSize: "clamp(1rem,2.5vw,1.25rem)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.06)",
              opacity: !entries.length ? 0.4 : 1, transition: "background 0.2s",
            }}>
            {spinning ? "finding a memory…" : "take me somewhere ✨"}
          </motion.button>
        </div>

        {!entries.length && (
          <p style={{ fontFamily: SANS, fontSize: "0.88rem", color: "rgba(253,164,175,0.3)", margin: 0 }}>
            add some memories to the journal first 🌸
          </p>
        )}

        {/* Card */}
        <AnimatePresence mode="wait">
          {shown && !spinning && (
            <motion.div key={shown.date}
              initial={{ opacity: 0, y: 32, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -18, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 220, damping: 26 }}
              style={{
                background: "rgba(0,0,0,0.25)", border: `1px solid ${ACC}22`,
                borderRadius: 24, overflow: "hidden", textAlign: "left",
                backdropFilter: "blur(20px)",
                boxShadow: "0 24px 80px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05)",
              }}>
              {(shown.photos?.length ?? 0) > 0 && (
                <div style={{ position: "relative", height: "clamp(180px,28vh,290px)" }}>
                  <AnimatePresence mode="wait">
                    <motion.img key={imgIdx} src={shown.photos[imgIdx]} alt=""
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.28 }}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block",
                        filter: "saturate(0.88) contrast(1.04)" }} />
                  </AnimatePresence>
                  <div style={{ position: "absolute", inset: 0,
                    background: "linear-gradient(to bottom,rgba(78,5,53,0.3) 0%,transparent 40%,rgba(61,3,47,0.85) 100%)" }} />
                  {shown.photos.length > 1 && (
                    <>
                      <button onClick={() => setImgIdx(i => (i - 1 + shown.photos.length) % shown.photos.length)}
                        style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                          background: "rgba(0,0,0,0.45)", border: `1px solid ${ACC}22`,
                          borderRadius: "50%", width: 34, height: 34, color: "#fff5f9", cursor: "pointer",
                          fontSize: "1.1rem", backdropFilter: "blur(6px)",
                          display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
                      <button onClick={() => setImgIdx(i => (i + 1) % shown.photos.length)}
                        style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                          background: "rgba(0,0,0,0.45)", border: `1px solid ${ACC}22`,
                          borderRadius: "50%", width: 34, height: 34, color: "#fff5f9", cursor: "pointer",
                          fontSize: "1.1rem", backdropFilter: "blur(6px)",
                          display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
                    </>
                  )}
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "1rem 1.4rem" }}>
                    <p style={{ fontFamily: SERIF, fontStyle: "italic",
                      fontSize: "clamp(0.95rem,2.5vw,1.2rem)", color: "#fff5f9", margin: 0,
                      textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}>
                      {d && `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`}
                    </p>
                  </div>
                </div>
              )}
              <div style={{ padding: "clamp(1rem,2.5vh,1.5rem) clamp(1rem,3vw,1.6rem)" }}>
                {!(shown.photos?.length) && d && (
                  <p style={{ fontFamily: SERIF, fontStyle: "italic",
                    fontSize: "clamp(1rem,2.5vw,1.15rem)", color: "#fff5f9", margin: "0 0 0.8rem" }}>
                    {DAYS[d.getDay()]}, {MONTHS[d.getMonth()]} {d.getDate()}, {d.getFullYear()}
                  </p>
                )}
                <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", marginBottom: "0.8rem", flexWrap: "wrap" }}>
                  {dn && <span style={{ fontFamily: SANS, fontSize: "0.68rem",
                    color: "rgba(253,164,175,0.4)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Day {dn} of us</span>}
                  {shown.mood && <span style={{ fontSize: "1.2rem" }}>{shown.mood}</span>}
                  {shown.special && (
                    <span style={{ fontFamily: SANS, fontSize: "0.68rem",
                      background: "rgba(0,0,0,0.3)", color: ACC,
                      borderRadius: 10, padding: "0.15rem 0.6rem", border: `1px solid ${ACC}22` }}>
                      ⭐ {shown.specialLabel || "special day"}
                    </span>
                  )}
                </div>
                {shown.note && (
                  <p style={{ fontFamily: SERIF, fontSize: "clamp(0.9rem,1.8vw,1.05rem)",
                    color: "rgba(255,245,249,0.78)", lineHeight: 1.88, margin: 0, fontStyle: "italic" }}>
                    "{shown.note.slice(0, 300)}{shown.note.length > 300 ? "…" : ""}"
                  </p>
                )}
              </div>
            </motion.div>
          )}
          {spinning && (
            <motion.div key="flicker"
              animate={{ opacity: [0.25, 0.85, 0.25] }} transition={{ repeat: Infinity, duration: 0.2 }}
              style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${ACC}15`,
                borderRadius: 24, padding: "2rem",
                color: "rgba(253,164,175,0.3)", fontFamily: SERIF, fontStyle: "italic", fontSize: "1.05rem" }}>
              {shown?.date}…
            </motion.div>
          )}
        </AnimatePresence>

        {shown && !spinning && (
          <motion.div style={{ display: "flex", justifyContent: "center" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            <motion.button onClick={spin}
              whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }}
              style={{ padding: "0.62rem 1.8rem", borderRadius: 30,
                border: `1px solid ${ACC}22`, background: "transparent",
                color: "rgba(253,164,175,0.5)", fontFamily: SANS, fontSize: "0.86rem", cursor: "pointer" }}>
              another one ✨
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}