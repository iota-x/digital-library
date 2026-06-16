"use client";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCalendarData } from "@/lib/calendarStore";
import { cldThumb } from "@/lib/cldImg";

const SERIF  = `"Georgia","Times New Roman",serif`;
const SANS   = `var(--font-lato),"Inter",system-ui,sans-serif`;
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function fmtFull(key: string) {
  const d = new Date(key+"T12:00:00");
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

interface Memory {
  key: string;
  label: string;
  emoji: string;
  entry: ReturnType<typeof useCalendarData>["data"][0];
}

export default function OnThisDay() {
  const { data } = useCalendarData();
  const [lightbox, setLightbox] = useState<string|null>(null);

  const memories = useMemo<Memory[]>(() => {
    const today = new Date();
    const result: Memory[] = [];
    const candidates = [
      { months: 1,  years: 0, label: "1 month ago",  emoji: "🌙" },
      { months: 3,  years: 0, label: "3 months ago", emoji: "💗" },
      { months: 6,  years: 0, label: "6 months ago", emoji: "🌸" },
      { months: 0,  years: 1, label: "1 year ago",   emoji: "⭐" },
    ];
    for (const c of candidates) {
      const d = new Date(today);
      if (c.months) d.setMonth(d.getMonth() - c.months);
      if (c.years)  d.setFullYear(d.getFullYear() - c.years);
      const key = toKey(d);
      const entry = data.find(e => e.date === key);
      if (entry && (entry.note || (entry.photos?.length ?? 0) > 0)) {
        result.push({ key, label: c.label, emoji: c.emoji, entry });
      }
    }
    return result;
  }, [data]);

  if (!memories.length) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "0.7rem" }}
      >
        {/* Section label */}
        <div style={{ display:"flex", alignItems:"center", gap:"0.8rem", marginBottom:"0.2rem" }}>
          <div style={{ width:40, height:1, background:"linear-gradient(90deg,transparent,rgba(var(--pink-deep-rgb),.3))" }}/>
          <span style={{ fontFamily:SANS, fontSize:"0.7rem", color:"rgba(var(--pink-deep-rgb),.55)", letterSpacing:"0.18em", textTransform:"uppercase" }}>
            on this day
          </span>
          <div style={{ width:40, height:1, background:"linear-gradient(90deg,rgba(var(--pink-deep-rgb),.3),transparent)" }}/>
        </div>

        {memories.map((m, i) => (
          <motion.div
            key={m.key}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1, duration: 0.45, ease: "easeOut" }}
            style={{
              background: "rgba(255,255,255,.78)",
              border: "1px solid rgba(var(--pink-deep-rgb),.15)",
              borderRadius: 18,
              padding: "1rem 1.3rem 1rem 1.6rem",
              boxShadow: "0 4px 20px rgba(var(--pink-deep-rgb),.1), 0 1px 4px rgba(0,0,0,.04)",
              display: "flex",
              gap: "1rem",
              alignItems: "flex-start",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Left accent bar */}
            <div style={{
              position:"absolute", left:0, top:0, bottom:0, width:4,
              background:"linear-gradient(180deg,var(--pink),var(--pink-deep))",
              borderRadius:"18px 0 0 18px",
            }}/>

            {/* Photo */}
            {(m.entry.photos?.length ?? 0) > 0 && (
              <motion.div
                whileHover={{ scale: 1.06 }}
                onClick={() => setLightbox(m.entry.photos[0])}
                style={{
                  width:68, height:68, flexShrink:0,
                  borderRadius:12, overflow:"hidden",
                  cursor:"pointer",
                  border:"2px solid rgba(var(--pink-rgb),.4)",
                  boxShadow:"0 4px 16px rgba(var(--pink-deep-rgb),.15)",
                }}
              >
                <img src={cldThumb(m.entry.photos[0], 128)} loading="lazy" decoding="async" alt=""
                  style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
              </motion.div>
            )}

            <div style={{ flex:1, minWidth:0 }}>
              {/* Label row */}
              <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", marginBottom:"0.3rem", flexWrap:"wrap" }}>
                <span style={{ fontSize:"1rem" }}>{m.emoji}</span>
                <span style={{
                  fontFamily:SANS, fontSize:"0.7rem", color:"var(--pink-deep)",
                  fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase",
                }}>
                  {m.label}
                </span>
                {m.entry.mood && <span style={{ fontSize:"0.95rem" }}>{m.entry.mood}</span>}
                {m.entry.special && (
                  <span style={{
                    fontFamily:SANS, fontSize:"0.65rem",
                    background:"linear-gradient(135deg,var(--pink),var(--pink-deep))",
                    color:"#fff", borderRadius:8, padding:"0.1rem 0.45rem",
                  }}>⭐ {m.entry.specialLabel||"special"}</span>
                )}
              </div>

              {/* Date */}
              <p style={{
                fontFamily:SERIF, fontStyle:"italic",
                fontSize:"clamp(0.8rem,2vw,0.92rem)",
                color:"rgba(var(--pink-deep-rgb),.6)", margin:"0 0 0.3rem",
              }}>
                {fmtFull(m.key)}
              </p>

              {/* Note preview */}
              {(m.entry.pinnedNote || m.entry.note) && (
                <p style={{
                  fontFamily:SERIF, fontStyle:"italic",
                  fontSize:"clamp(0.86rem,2vw,0.98rem)",
                  color:"#4a1628", margin:0, lineHeight:1.7,
                  overflow:"hidden", display:"-webkit-box",
                  WebkitLineClamp:2, WebkitBoxOrient:"vertical" as const,
                }}>
                  "{m.entry.pinnedNote || m.entry.note?.slice(0,120)}{(!m.entry.pinnedNote && (m.entry.note?.length??0)>120)?"…":""}"
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={() => setLightbox(null)}
            style={{
              position:"fixed", inset:0, zIndex:9000,
              background:"rgba(0,0,0,.93)",
              display:"flex", alignItems:"center", justifyContent:"center",
              padding:"2rem",
            }}
          >
            <motion.img src={lightbox} alt=""
              initial={{ scale:0.85 }} animate={{ scale:1 }} exit={{ scale:0.85 }}
              transition={{ type:"spring", stiffness:200, damping:24 }}
              style={{ maxWidth:"88vw", maxHeight:"82vh", objectFit:"contain", borderRadius:8 }}
              onClick={e => e.stopPropagation()}
            />
            <button onClick={() => setLightbox(null)}
              style={{ position:"absolute", top:"1.2rem", right:"1.2rem", background:"rgba(255,255,255,.1)", border:"1px solid rgba(255,255,255,.2)", borderRadius:"50%", width:38, height:38, color:"#fff", cursor:"pointer", fontSize:"1rem", display:"flex", alignItems:"center", justifyContent:"center" }}>
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}