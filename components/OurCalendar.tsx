"use client";
import React, { useRef, useState, useEffect, useCallback, memo } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { updateCalendarCache, deleteFromCalendarCache } from "@/lib/calendarStore";

interface CalEntry {
  date: string; note: string; photos: string[];
  special: boolean; specialLabel: string; mood: string;
}

const START       = new Date("2026-03-11");
const START_DAY   = 11;
const START_MONTH = 2;

const MONTHS     = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_SHORT = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const DAYS_FULL  = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const SPECIAL_LABELS = [
  "🌹 First date","💗 Special moment","🌙 Late night talk","✈️ Adventure",
  "🎂 Birthday","💌 Important","⭐ Favourite memory","🎶 Our song",
  "🌸 Just us","🎮 Gaming night","🍜 Food date","🌃 Night out","📞 Sleep call",
];
const MOODS = ["🥰","😊","🥺","😂","🌙","💗","✨","🎮","🌷","😴","🤭","💫"];

const SERIF  = `"Georgia","Times New Roman",serif`;
const SANS   = `var(--font-lato),"Inter",system-ui,sans-serif`;
const SCRIPT = `var(--font-caveat),"Segoe Script",cursive`;
const GRAIN  = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`;

function toKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function dayNum(key: string) {
  return Math.floor((new Date(key + "T12:00:00").getTime() - START.getTime()) / 86400000) + 1;
}
function fmtDate(key: string) {
  const d = new Date(key + "T12:00:00");
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}
function inOurTime(key: string) {
  return new Date(key + "T12:00:00") >= START;
}
function isAnniversary(year: number, month: number, day: number) {
  if (day !== START_DAY) return false;
  if (month === START_MONTH && year === START.getFullYear()) return false;
  const d = new Date(year, month, day);
  return d >= START;
}

const SNAP   = { type: "spring", stiffness: 380, damping: 32 } as const;
const BOUNCY = { type: "spring", stiffness: 280, damping: 22 } as const;
const GENTLE = { type: "spring", stiffness: 180, damping: 28 } as const;

/* ── Lightbox ── */
// FIX lines 102 & 104: initial/exit as functions with custom don't typecheck cleanly.
// Solution: use variants with a custom prop typed via VariantLabels pattern.
const lbVariants = {
  enter: (d: number) => ({ opacity: 0, scale: 0.9, x: d > 0 ? 60 : -60 }),
  center: { opacity: 1, scale: 1, x: 0 },
  exit:  (d: number) => ({ opacity: 0, scale: 0.9, x: d > 0 ? -60 : 60 }),
};

const Lightbox = memo(function Lightbox({
  photos, startIdx, onClose,
}: { photos: string[]; startIdx: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIdx);
  const [dir, setDir] = useState(0);
  const go = useCallback((d: number) => {
    setDir(d); setIdx(i => (i + d + photos.length) % photos.length);
  }, [photos.length]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [go, onClose]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }} onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 9900, background: "rgba(4,0,2,.97)", display: "flex", alignItems: "center", justifyContent: "center" }}>

      {photos.length > 1 && (
        <motion.button onClick={e => { e.stopPropagation(); go(-1); }}
          whileHover={{ scale: 1.12, x: -3 }} whileTap={{ scale: 0.9 }}
          style={{ position: "absolute", left: "clamp(0.8rem,3vw,2.5rem)", background: "rgba(236,72,153,.15)", border: "1px solid rgba(236,72,153,.3)", borderRadius: "50%", width: 52, height: 52, cursor: "pointer", color: "#f9a8d4", fontSize: "1.4rem", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }}>‹</motion.button>
      )}

      <AnimatePresence mode="wait" custom={dir}>
        <motion.div
          key={idx}
          custom={dir}
          variants={lbVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={BOUNCY}
          onClick={e => e.stopPropagation()}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.2rem", maxWidth: "82vw" }}>
          <img src={photos[idx]} alt="" style={{ maxWidth: "82vw", maxHeight: "78vh", objectFit: "contain", borderRadius: 4, boxShadow: "0 40px 100px rgba(0,0,0,.85)", display: "block" }} />
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
            {photos.map((_, i) => (
              <div key={i} onClick={e => { e.stopPropagation(); setIdx(i); }}
                style={{ width: i === idx ? 10 : 6, height: i === idx ? 10 : 6, borderRadius: "50%", background: i === idx ? "#ec4899" : "rgba(249,168,212,.35)", transition: "all 0.2s", cursor: "pointer" }} />
            ))}
          </div>
          <p style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "rgba(244,114,182,.4)", letterSpacing: "0.15em", margin: 0 }}>
            {idx + 1} / {photos.length} · ESC to close · ← → navigate
          </p>
        </motion.div>
      </AnimatePresence>

      {photos.length > 1 && (
        <motion.button onClick={e => { e.stopPropagation(); go(1); }}
          whileHover={{ scale: 1.12, x: 3 }} whileTap={{ scale: 0.9 }}
          style={{ position: "absolute", right: "clamp(0.8rem,3vw,2.5rem)", background: "rgba(236,72,153,.15)", border: "1px solid rgba(236,72,153,.3)", borderRadius: "50%", width: 52, height: 52, cursor: "pointer", color: "#f9a8d4", fontSize: "1.4rem", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }}>›</motion.button>
      )}

      <motion.button onClick={onClose} whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
        style={{ position: "absolute", top: "1.2rem", right: "1.2rem", background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", borderRadius: "50%", width: 40, height: 40, cursor: "pointer", color: "rgba(255,255,255,.65)", fontSize: "1rem", zIndex: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</motion.button>
    </motion.div>
  );
});

/* ── Polaroid Stack ── */
const PolaroidStack = memo(function PolaroidStack({
  photos, dateKey, onPhotoClick,
}: { photos: string[]; dateKey: string; onPhotoClick: (i: number) => void }) {
  const [topIdx, setTopIdx] = useState(0);
  const mx = useMotionValue(0.5), my = useMotionValue(0.5);
  const sx = useSpring(mx, { stiffness: 80, damping: 18 });
  const sy = useSpring(my, { stiffness: 80, damping: 18 });
  const rotX = useTransform(sy, [0, 1], [6, -6]);
  const rotY = useTransform(sx, [0, 1], [-6, 6]);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => { mx.set(0.5); my.set(0.5); };
  const SIZE = 260;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2rem" }}>
      <div onMouseMove={onMove} onMouseLeave={onLeave}
        style={{ position: "relative", width: SIZE, height: SIZE + 52, flexShrink: 0, perspective: 1000 }}>
        {photos.map((src, i) => {
          const isTop = i === topIdx, offset = i - topIdx;
          return (
            <motion.div key={i}
              animate={{ rotate: isTop ? 0 : offset * 5, x: isTop ? 0 : offset * 14, y: isTop ? 0 : Math.abs(offset) * 5, scale: isTop ? 1 : 1 - Math.abs(offset) * 0.05, zIndex: photos.length - Math.abs(offset) }}
              transition={SNAP}
              style={{ position: "absolute", width: "100%", height: "100%", cursor: "pointer", rotateX: isTop ? rotX : 0, rotateY: isTop ? rotY : 0, transformStyle: "preserve-3d" }}
              onClick={() => isTop ? onPhotoClick(i) : setTopIdx(i)}>
              <div style={{ width: "100%", height: "100%", background: "#fefefe", padding: "9px 9px 52px", boxShadow: isTop ? "0 36px 90px rgba(0,0,0,.65),0 8px 28px rgba(236,72,153,.22)" : "0 10px 35px rgba(0,0,0,.45)" }}>
                <div style={{ width: "100%", paddingBottom: "100%", position: "relative", overflow: "hidden" }}>
                  <img src={src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "saturate(0.95) contrast(1.02)" }} />
                </div>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 52, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
                  <span style={{ fontFamily: "monospace", fontSize: "0.68rem", color: "rgba(80,40,60,.5)", letterSpacing: "0.12em", fontWeight: 600 }}>{fmtDate(dateKey)}</span>
                  {photos.length > 1 && <span style={{ fontFamily: "monospace", fontSize: "0.56rem", color: "rgba(80,40,60,.32)", letterSpacing: "0.08em" }}>{i + 1}/{photos.length}</span>}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {photos.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <motion.button onClick={() => setTopIdx(i => (i - 1 + photos.length) % photos.length)} whileHover={{ scale: 1.12, x: -2 }} whileTap={{ scale: 0.9 }}
            style={{ background: "rgba(236,72,153,.1)", border: "1px solid rgba(236,72,153,.22)", borderRadius: "50%", width: 38, height: 38, cursor: "pointer", color: "#f9a8d4", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</motion.button>
          <div style={{ display: "flex", gap: "0.45rem" }}>
            {photos.map((_, i) => (
              <div key={i} onClick={() => setTopIdx(i)}
                style={{ width: i === topIdx ? 10 : 6, height: i === topIdx ? 10 : 6, borderRadius: "50%", background: i === topIdx ? "#ec4899" : "rgba(249,168,212,.32)", transition: "all 0.2s", cursor: "pointer" }} />
            ))}
          </div>
          <motion.button onClick={() => setTopIdx(i => (i + 1) % photos.length)} whileHover={{ scale: 1.12, x: 2 }} whileTap={{ scale: 0.9 }}
            style={{ background: "rgba(236,72,153,.1)", border: "1px solid rgba(236,72,153,.22)", borderRadius: "50%", width: 38, height: 38, cursor: "pointer", color: "#f9a8d4", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>›</motion.button>
        </div>
      )}
      {photos.length > 1 && (
        <p style={{ fontFamily: SANS, fontSize: "0.78rem", color: "rgba(244,114,182,.35)", margin: 0, textAlign: "center" }}>
          tap photo to fullscreen · tap back card to bring forward
        </p>
      )}
    </div>
  );
});

/* ── Film Strip ──
   FIX line 220: rotate={angle} is not a valid direct prop on motion.div.
   Use animate={{ rotate: angle }} instead — this is the correct framer-motion API.
*/
const FilmStrip = memo(function FilmStrip({
  photos, dateKey, onPhotoClick,
}: { photos: string[]; dateKey: string; onPhotoClick: (i: number) => void }) {
  return (
    <div style={{ display: "flex", gap: "0.8rem", overflowX: "auto", paddingBottom: "1.5rem", paddingTop: "0.5rem", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
      {photos.map((src, i) => {
        const angle = (i - (photos.length - 1) / 2) * 2.5;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 28, rotate: angle }}
            animate={{ opacity: 1, y: 0, rotate: angle }}
            transition={{ delay: i * 0.06, ...BOUNCY }}
            whileHover={{ scale: 1.08, rotate: 0, y: -10, zIndex: 20 }}
            onClick={() => onPhotoClick(i)}
            style={{
              cursor: "pointer",
              flexShrink: 0,
              position: "relative",
              background: "#100408",
              padding: "7px 7px 28px",
              boxShadow: "0 18px 50px rgba(0,0,0,.7)",
              width: 140,
              zIndex: 10 + i,
            }}
          >
            <div style={{ position: "absolute", top: 4,  left: 2, width: 5, height: 11, borderRadius: 2, background: "#000" }} />
            <div style={{ position: "absolute", top: 24, left: 2, width: 5, height: 11, borderRadius: 2, background: "#000" }} />
            <div style={{ position: "absolute", top: 44, left: 2, width: 5, height: 11, borderRadius: 2, background: "#000" }} />
            <div style={{ position: "absolute", top: 64, left: 2, width: 5, height: 11, borderRadius: 2, background: "#000" }} />
            <div style={{ position: "absolute", top: 4,  right: 2, width: 5, height: 11, borderRadius: 2, background: "#000" }} />
            <div style={{ position: "absolute", top: 24, right: 2, width: 5, height: 11, borderRadius: 2, background: "#000" }} />
            <div style={{ position: "absolute", top: 44, right: 2, width: 5, height: 11, borderRadius: 2, background: "#000" }} />
            <div style={{ position: "absolute", top: 64, right: 2, width: 5, height: 11, borderRadius: 2, background: "#000" }} />
            <img src={src} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block", filter: "saturate(0.85) contrast(1.08)" }} />
            <div style={{ position: "absolute", bottom: 4, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: "0.56rem", color: "rgba(255,170,150,.4)", letterSpacing: "0.1em" }}>
              {fmtDate(dateKey)} · {String(i + 1).padStart(2, "0")}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
});

const FL = ({ children }: { children: React.ReactNode }) => (
  <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.68rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(244,114,182,.45)", margin: "0 0 0.65rem" }}>
    {children}
  </p>
);

function AnnivBanner({ monthNumber }: { monthNumber: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.2, ...BOUNCY }}
      style={{ background: "linear-gradient(135deg,#fde68a,#fbbf24,#f59e0b)", borderRadius: 14, padding: "0.9rem 1.2rem", marginBottom: "1.2rem", display: "flex", alignItems: "center", gap: "0.8rem", boxShadow: "0 4px 20px rgba(245,158,11,.35)" }}>
      <motion.span style={{ fontSize: "1.8rem" }} animate={{ rotate: [-8, 8, -8], scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>👑</motion.span>
      <div>
        <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "1rem", color: "#78350f", margin: 0, fontWeight: 700 }}>{monthNumber} month{monthNumber !== 1 ? "s" : ""} together! 🎉</p>
        <p style={{ fontFamily: SANS, fontSize: "0.76rem", color: "rgba(120,53,15,.65)", margin: "0.1rem 0 0" }}>happy {monthNumber}-month anniversary 🌸</p>
      </div>
    </motion.div>
  );
}

function DayView({ dateKey, entry, originRect, onClose, onSave, onDelete }: {
  dateKey: string; entry: Partial<CalEntry>; originRect: DOMRect | null;
  onClose: () => void; onSave: (d: Partial<CalEntry>) => Promise<void>; onDelete: () => Promise<void>;
}) {
  const [draft, setDraft]         = useState<Partial<CalEntry>>({ note: "", photos: [], ...entry });
  const [tab, setTab]             = useState<"view" | "edit">(entry.note || (entry.photos?.length ?? 0) > 0 ? "view" : "edit");
  const [saving, setSaving]       = useState(false);
  const [lbox, setLbox]           = useState<number | null>(null);
  const [photoMode, setPhotoMode] = useState<"polaroid" | "film">("polaroid");
  const fileRef = useRef<HTMLInputElement>(null);

  const displayDate = new Date(dateKey + "T12:00:00");
  const isOurs      = displayDate >= START;
  const dn          = isOurs ? dayNum(dateKey) : null;
  const hasContent  = !!(draft.note || (draft.photos?.length ?? 0) > 0);
  const hasPhotos   = (draft.photos?.length ?? 0) > 0;
  const yr = displayDate.getFullYear(), mo = displayDate.getMonth(), dy = displayDate.getDate();
  const anniv       = isAnniversary(yr, mo, dy);
  const monthsSince = anniv ? (yr - START.getFullYear()) * 12 + (mo - START_MONTH) : 0;

  const addPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach(f => {
      const r = new FileReader();
      r.onload = ev => setDraft(d => ({ ...d, photos: [...(d.photos || []), ev.target?.result as string] }));
      r.readAsDataURL(f);
    });
    e.target.value = "";
  };
  const removePhoto = (i: number) => setDraft(d => ({ ...d, photos: (d.photos || []).filter((_, j) => j !== i) }));
  const save = async () => { setSaving(true); await onSave(draft); setSaving(false); };

  const ix = originRect ? originRect.left + originRect.width / 2 - (typeof window !== "undefined" ? window.innerWidth : 800) / 2 : 0;
  const iy = originRect ? originRect.top + originRect.height / 2 - (typeof window !== "undefined" ? window.innerHeight : 600) / 2 : 0;

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        style={{ position: "fixed", inset: 0, zIndex: 4000, background: "rgba(6,1,4,.78)", backdropFilter: "blur(22px)", WebkitBackdropFilter: "blur(22px)" }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.06, borderRadius: 999, x: ix, y: iy }}
        animate={{ opacity: 1, scale: 1, borderRadius: 20, x: 0, y: 0 }}
        exit={{ opacity: 0, scale: 0.06, borderRadius: 999, x: ix / 2, y: iy / 2 }}
        transition={{ ...GENTLE, mass: 0.9 }}
        style={{ position: "fixed", inset: "1.5vh 1.5vw", zIndex: 4001, background: "linear-gradient(150deg,#160708 0%,#28091a 50%,#160b10 100%)", backgroundImage: `${GRAIN},linear-gradient(150deg,#160708 0%,#28091a 50%,#160b10 100%)`, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: anniv ? "0 50px 140px rgba(0,0,0,.9),0 0 0 2px rgba(245,158,11,.5),0 0 40px rgba(251,191,36,.15)" : "0 50px 140px rgba(0,0,0,.9),0 0 0 1px rgba(236,72,153,.1)" }}>

        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
          style={{ height: 2, transformOrigin: "left", flexShrink: 0, background: anniv ? "linear-gradient(90deg,transparent,rgba(251,191,36,.8) 40%,#fde68a 50%,rgba(251,191,36,.8) 60%,transparent)" : "linear-gradient(90deg,transparent,rgba(236,72,153,.6) 40%,rgba(244,114,182,.8) 50%,rgba(236,72,153,.6) 60%,transparent)" }} />

        <div style={{ padding: "1.4rem 1.8rem 1rem", borderBottom: "1px solid rgba(236,72,153,.08)", flexShrink: 0, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            {dn && (
              <motion.span initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                style={{ fontFamily: SANS, fontSize: "0.65rem", letterSpacing: "0.25em", textTransform: "uppercase", color: anniv ? "rgba(251,191,36,.6)" : "rgba(244,114,182,.4)", display: "block", marginBottom: "0.3rem" }}>
                day {dn} of us {anniv ? "👑" : "🌸"}
              </motion.span>
            )}
            <motion.h2 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, ...BOUNCY }}
              style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "clamp(1.25rem,3vw,1.9rem)", color: anniv ? "#fde68a" : "#fce7f3", margin: 0, textShadow: anniv ? "0 0 40px rgba(251,191,36,.3)" : "0 0 50px rgba(236,72,153,.2)", fontWeight: 400 }}>
              {DAYS_FULL[displayDate.getDay()]}, {MONTHS[displayDate.getMonth()]} {displayDate.getDate()}, {displayDate.getFullYear()}
            </motion.h2>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28 }}
              style={{ display: "flex", alignItems: "center", gap: "0.7rem", marginTop: "0.35rem", flexWrap: "wrap" }}>
              {draft.specialLabel && <span style={{ fontFamily: SANS, fontSize: "0.92rem", color: "#f9a8d4" }}>{draft.specialLabel}</span>}
              {draft.mood && <span style={{ fontSize: "1.4rem" }}>{draft.mood}</span>}
              <span style={{ fontFamily: "monospace", fontSize: "0.68rem", color: "rgba(244,114,182,.3)", letterSpacing: "0.1em" }}>{fmtDate(dateKey)}</span>
            </motion.div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
            {hasContent && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
                style={{ background: "rgba(255,255,255,.04)", borderRadius: 30, padding: "0.18rem", display: "flex", border: "1px solid rgba(236,72,153,.15)" }}>
                {(["view", "edit"] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    style={{ padding: "0.3rem 0.9rem", borderRadius: 26, border: "none", fontFamily: SANS, fontSize: "0.85rem", cursor: "pointer", background: tab === t ? "linear-gradient(135deg,rgba(236,72,153,.4),rgba(190,24,93,.3))" : "transparent", color: tab === t ? "#fce7f3" : "rgba(252,231,243,.35)", boxShadow: tab === t ? "0 2px 10px rgba(236,72,153,.2)" : "none", transition: "all 0.18s" }}>
                    {t === "view" ? "💌 memory" : "✏️ edit"}
                  </button>
                ))}
              </motion.div>
            )}
            <motion.button onClick={onClose} whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
              style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(236,72,153,.15)", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", color: "rgba(252,231,243,.6)", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</motion.button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
          <AnimatePresence mode="wait">
            {tab === "view" && (
              <motion.div key="view" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.22 }} style={{ padding: "1.6rem 1.8rem", minHeight: "100%" }}>
                {anniv && <AnnivBanner monthNumber={monthsSince} />}
                {hasPhotos && (
                  <div style={{ marginBottom: "1.8rem" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.2rem" }}>
                      <span style={{ fontFamily: SANS, fontSize: "0.75rem", color: "rgba(244,114,182,.4)", letterSpacing: "0.14em", textTransform: "uppercase" }}>{draft.photos!.length} photo{draft.photos!.length !== 1 ? "s" : ""}</span>
                      <div style={{ display: "flex", gap: "0.35rem" }}>
                        {(["polaroid", "film"] as const).map(m => (
                          <motion.button key={m} onClick={() => setPhotoMode(m)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            style={{ padding: "0.25rem 0.75rem", borderRadius: 20, border: `1px solid ${photoMode === m ? "rgba(236,72,153,.5)" : "rgba(236,72,153,.18)"}`, background: photoMode === m ? "rgba(236,72,153,.15)" : "transparent", color: photoMode === m ? "#f9a8d4" : "rgba(244,114,182,.38)", fontFamily: SANS, fontSize: "0.78rem", cursor: "pointer", transition: "all 0.18s" }}>
                            {m === "polaroid" ? "🖼 polaroid" : "🎞 film"}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                    {photoMode === "polaroid"
                      ? <PolaroidStack photos={draft.photos!} dateKey={dateKey} onPhotoClick={setLbox} />
                      : <FilmStrip photos={draft.photos!} dateKey={dateKey} onPhotoClick={setLbox} />
                    }
                  </div>
                )}
                {draft.note ? (
                  <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(236,72,153,.08)", borderRadius: 16, padding: "1.6rem 1.6rem 1.6rem 2rem", position: "relative", overflow: "hidden", marginTop: hasPhotos ? "2rem" : "0" }}>
                    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "repeating-linear-gradient(transparent,transparent 31px,rgba(236,72,153,.05) 31px,rgba(236,72,153,.05) 32px)" }} />
                    <div style={{ position: "absolute", left: "2.6rem", top: 0, bottom: 0, width: 1, background: "rgba(236,72,153,.09)" }} />
                    <p style={{ fontFamily: SERIF, fontSize: "clamp(1rem,2.2vw,1.18rem)", color: "rgba(252,231,243,.88)", lineHeight: "2rem", margin: 0, whiteSpace: "pre-wrap", position: "relative", zIndex: 1, fontWeight: 400, letterSpacing: "0.01em" }}>{draft.note}</p>
                    <div style={{ marginTop: "1.3rem", display: "flex", alignItems: "center", gap: "0.5rem", position: "relative", zIndex: 1 }}>
                      <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,rgba(236,72,153,.28),transparent)" }} />
                      <span style={{ fontFamily: SCRIPT, fontSize: "0.85rem", color: "rgba(244,114,182,.4)" }}>— with love 🩷</span>
                    </div>
                  </motion.div>
                ) : !hasPhotos && !anniv && (
                  <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
                    <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 3 }} style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🌸</motion.div>
                    <p style={{ fontFamily: SANS, fontSize: "1.05rem", color: "rgba(244,114,182,.28)", margin: 0 }}>nothing here yet — tap edit to add a memory</p>
                  </div>
                )}
              </motion.div>
            )}

            {(tab === "edit" || !hasContent) && (
              <motion.div key="edit" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.22 }} style={{ padding: "1.6rem 1.8rem", display: "flex", flexDirection: "column", gap: "1.3rem" }}>
                <div>
                  <FL>How are you feeling?</FL>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
                    {MOODS.map(m => (
                      <motion.button key={m} onClick={() => setDraft(d => ({ ...d, mood: d.mood === m ? "" : m }))}
                        whileHover={{ scale: 1.22, y: -5 }} whileTap={{ scale: 0.88 }}
                        style={{ fontSize: "1.45rem", background: draft.mood === m ? "rgba(236,72,153,.18)" : "rgba(255,255,255,.035)", border: `1.5px solid ${draft.mood === m ? "rgba(236,72,153,.55)" : "rgba(255,255,255,.06)"}`, borderRadius: 12, padding: "0.32rem", cursor: "pointer", boxShadow: draft.mood === m ? "0 4px 18px rgba(236,72,153,.28)" : "none", transition: "all 0.15s" }}>
                        {m}
                      </motion.button>
                    ))}
                  </div>
                </div>
                <div>
                  <FL>Photos</FL>
                  {(draft.photos || []).length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", marginBottom: "0.8rem" }}>
                      {draft.photos!.map((src, i) => (
                        <div key={i} style={{ position: "relative" }}>
                          <img src={src} style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, display: "block", border: "1px solid rgba(236,72,153,.18)" }} alt="" />
                          <motion.button onClick={() => removePhoto(i)} whileHover={{ scale: 1.15 }}
                            style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", border: "none", background: "#be185d", color: "#fff", fontSize: "0.6rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</motion.button>
                        </div>
                      ))}
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={addPhotos} />
                  <motion.button onClick={() => fileRef.current?.click()} whileHover={{ scale: 1.01, borderColor: "rgba(236,72,153,.5)" }} whileTap={{ scale: 0.98 }}
                    style={{ width: "100%", padding: "0.85rem", background: "rgba(236,72,153,.04)", border: "1.5px dashed rgba(236,72,153,.24)", borderRadius: 12, cursor: "pointer", fontFamily: SANS, fontSize: "0.98rem", color: "rgba(244,114,182,.7)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", transition: "border-color 0.2s" }}>
                    📸 Add photos — select multiple at once
                  </motion.button>
                </div>
                <div>
                  <FL>Journal</FL>
                  <textarea value={draft.note || ""} onChange={e => setDraft(d => ({ ...d, note: e.target.value }))}
                    placeholder={"Write about this day…\n\nHow did it feel? What do you want to remember? 🌸"} rows={6}
                    style={{ width: "100%", padding: "1rem 1rem 1rem 1.4rem", background: "rgba(255,255,255,.03)", border: "1px solid rgba(236,72,153,.16)", borderRadius: 12, resize: "vertical", fontFamily: SERIF, fontSize: "clamp(0.95rem,2.2vw,1.1rem)", color: "rgba(252,231,243,.85)", outline: "none", boxSizing: "border-box", lineHeight: 1.9, caretColor: "#f9a8d4", letterSpacing: "0.01em" }} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", cursor: "pointer", marginBottom: "0.75rem" }}
                    onClick={() => setDraft(d => ({ ...d, special: !d.special }))}>
                    <motion.div animate={{ background: draft.special ? "linear-gradient(135deg,#ec4899,#be185d)" : "transparent", borderColor: draft.special ? "#ec4899" : "rgba(236,72,153,.28)" }}
                      style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      {draft.special && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ color: "#fff", fontSize: "0.7rem" }}>✓</motion.span>}
                    </motion.div>
                    <span style={{ fontFamily: SANS, fontSize: "0.98rem", color: "rgba(252,231,243,.72)" }}>Mark as a special day ⭐</span>
                  </div>
                  <AnimatePresence>
                    {draft.special && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", overflow: "hidden" }}>
                        {SPECIAL_LABELS.map(lbl => (
                          <motion.button key={lbl} onClick={() => setDraft(d => ({ ...d, specialLabel: d.specialLabel === lbl ? "" : lbl }))}
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.94 }}
                            style={{ padding: "0.28rem 0.7rem", borderRadius: 20, border: `1.5px solid ${draft.specialLabel === lbl ? "#ec4899" : "rgba(236,72,153,.2)"}`, background: draft.specialLabel === lbl ? "rgba(236,72,153,.2)" : "rgba(255,255,255,.03)", color: draft.specialLabel === lbl ? "#f9a8d4" : "rgba(244,114,182,.45)", fontFamily: SANS, fontSize: "0.85rem", cursor: "pointer", transition: "all 0.15s" }}>
                            {lbl}
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div style={{ display: "flex", gap: "0.7rem", paddingBottom: "1.2rem" }}>
                  <motion.button onClick={save} disabled={saving} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
                    style={{ flex: 1, padding: "0.95rem", borderRadius: 14, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#ec4899,#be185d)", color: "#fff", fontFamily: SANS, fontSize: "1rem", fontWeight: 700, boxShadow: "0 6px 24px rgba(236,72,153,.38)" }}>
                    {saving ? "Saving…" : "Save memory 💗"}
                  </motion.button>
                  {hasContent && (
                    <motion.button onClick={onDelete} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      style={{ padding: "0.95rem 1.2rem", borderRadius: 14, border: "1px solid rgba(236,72,153,.2)", cursor: "pointer", background: "rgba(255,255,255,.02)", color: "rgba(244,114,182,.5)", fontFamily: SANS, fontSize: "0.98rem" }}>Clear</motion.button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <AnimatePresence>
        {lbox !== null && <Lightbox photos={draft.photos!} startIdx={lbox} onClose={() => setLbox(null)} />}
      </AnimatePresence>
    </>
  );
}

const DayCell = memo(function DayCell({ day, month, year, dateKey, entry, isToday, isOurs, onClick }: {
  day: number; month: number; year: number; dateKey: string; entry?: CalEntry; isToday: boolean; isOurs: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const isSpecial = !!entry?.special;
  const isAnniv   = isAnniversary(year, month, day);
  const hasPhoto  = (entry?.photos?.length ?? 0) > 0;
  const hasNote   = !!entry?.note;

  const bg = isAnniv ? "linear-gradient(135deg,#fde68a,#f59e0b)" : isSpecial ? "linear-gradient(135deg,#fda4af,#ec4899)" : isToday ? "linear-gradient(135deg,#fce7f3,#fbcfe8)" : hasPhoto || hasNote ? "rgba(249,168,212,.22)" : isOurs ? "rgba(249,168,212,.06)" : "transparent";
  const shadow = isAnniv ? "0 4px 18px rgba(245,158,11,.55)" : isSpecial ? "0 3px 14px rgba(236,72,153,.4)" : isToday ? "0 2px 10px rgba(244,114,182,.25)" : "none";
  const textColor = isAnniv ? "#78350f" : isSpecial ? "#fff" : isToday ? "#be185d" : isOurs ? "#9d3f68" : "#c4a0b0";

  return (
    <motion.button onClick={onClick} initial={{ opacity: 0, scale: 0.72 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: (day - 1) * 0.008, ...SNAP }} whileHover={{ scale: 1.2, zIndex: 5, y: -3 }} whileTap={{ scale: 0.88 }}
      style={{ position: "relative", aspectRatio: "1", border: "none", borderRadius: 8, cursor: "pointer", background: bg, boxShadow: shadow, outline: isToday ? "2px solid #f9a8d4" : isAnniv ? "2px solid #f59e0b" : "none", outlineOffset: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, padding: "1px", transition: "background 0.18s" }}>
      <span style={{ fontFamily: SANS, fontSize: "clamp(0.7rem,2vw,0.88rem)", color: textColor, fontWeight: isToday || isSpecial || isAnniv ? 700 : isOurs ? 500 : 400, lineHeight: 1 }}>{day}</span>
      {entry?.mood && <span style={{ fontSize: "clamp(0.45rem,1.2vw,0.58rem)", lineHeight: 1 }}>{entry.mood}</span>}
      {isAnniv && !entry?.mood && <span style={{ fontSize: "0.48rem", lineHeight: 1 }}>👑</span>}
      {isSpecial && !isAnniv && !entry?.mood && <span style={{ fontSize: "0.48rem", lineHeight: 1 }}>⭐</span>}
      {hasPhoto && !isSpecial && !isAnniv && !entry?.mood && <span style={{ fontSize: "0.45rem", lineHeight: 1 }}>📸</span>}
      {hasNote && !hasPhoto && !isSpecial && !isAnniv && !entry?.mood && <div style={{ width: 3, height: 3, borderRadius: "50%", background: "#f472b6" }} />}
    </motion.button>
  );
});

export default function OurCalendar() {
  const today = new Date();
  const [year, setYear]           = useState(today.getFullYear());
  const [month, setMonth]         = useState(today.getMonth());
  const [entries, setEntries]     = useState<Record<string, CalEntry>>({});
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<string | null>(null);
  const [originRect, setOriginRect] = useState<DOMRect | null>(null);
  const [slideDir, setSlideDir]   = useState<1 | -1>(1);

  useEffect(() => {
    fetch("/api/calendar").then(r => r.json()).then((arr: CalEntry[]) => {
      const map: Record<string, CalEntry> = {};
      arr.forEach(e => { map[e.date] = e; });
      setEntries(map);
    }).finally(() => setLoading(false));
  }, []);

  const changeMonth = useCallback((dir: 1 | -1) => {
    setSlideDir(dir);
    setMonth(m => {
      const nm = m + dir;
      if (nm > 11) { setYear(y => y + 1); return 0; }
      if (nm < 0)  { setYear(y => y - 1); return 11; }
      return nm;
    });
  }, []);

  const openDay = useCallback((key: string, e: React.MouseEvent<HTMLButtonElement>) => {
    setOriginRect(e.currentTarget.getBoundingClientRect());
    setSelected(key);
  }, []);

  const handleSave = useCallback(async (draft: Partial<CalEntry>) => {
    if (!selected) return;
    const payload = { ...draft, date: selected } as CalEntry;
    await fetch("/api/calendar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setEntries(p => ({ ...p, [selected]: payload }));
    updateCalendarCache(payload);
    setSelected(null);
  }, [selected]);

  const handleDelete = useCallback(async () => {
    if (!selected) return;
    await fetch("/api/calendar", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: selected }) });
    setEntries(p => { const n = { ...p }; delete n[selected]; return n; });
    deleteFromCalendarCache(selected);
    setSelected(null);
  }, [selected]);

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const totalMem       = Object.keys(entries).length;
  const specialCnt     = Object.values(entries).filter(e => e.special).length;
  const daysSince      = Math.floor((today.getTime() - START.getTime()) / 86400000) + 1;
  const thisMonthAnniv = isAnniversary(year, month, START_DAY);
  const monthsSince    = thisMonthAnniv ? (year - START.getFullYear()) * 12 + (month - START_MONTH) : 0;

  return (
    <section id="calendar" style={{ position: "relative", width: "100%", padding: "6rem clamp(1rem,3vw,1.5rem) 7rem", background: "linear-gradient(180deg,#fff5f9,#fce7f3 50%,#fff0f5)", overflow: "hidden" }}>
      {[{ l: "3%", t: "6%", c: "rgba(249,168,212,.18)" }, { l: "72%", t: "2%", c: "rgba(253,186,213,.14)" }, { l: "48%", t: "76%", c: "rgba(244,114,182,.09)" }].map((o, i) => (
        <motion.div key={i} style={{ position: "absolute", left: o.l, top: o.t, width: 280, height: 280, borderRadius: "50%", background: o.c, filter: "blur(65px)", pointerEvents: "none", zIndex: 0 }}
          animate={{ scale: [1, 1.22, 1], opacity: [0.45, 0.85, 0.45] }} transition={{ repeat: Infinity, duration: 6 + i * 2, ease: "easeInOut" }} />
      ))}

      <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        style={{ textAlign: "center", marginBottom: "3rem", position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", marginBottom: "1rem" }}>
          <div style={{ width: 60, height: 1, background: "linear-gradient(90deg,transparent,#f9a8d4)" }} />
          <motion.span style={{ fontSize: "1.8rem" }} animate={{ scale: [1, 1.2, 1], rotate: [-5, 5, -5] }} transition={{ repeat: Infinity, duration: 2.5 }}>💗</motion.span>
          <div style={{ width: 60, height: 1, background: "linear-gradient(90deg,#f9a8d4,transparent)" }} />
        </div>
        <h2 style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "clamp(1.8rem,4vw,2.8rem)", color: "#be185d", margin: "0 0 0.5rem", fontWeight: 400 }}>our days together</h2>
        <p style={{ fontFamily: SANS, fontSize: "clamp(0.85rem,2vw,1rem)", color: "rgba(190,24,93,.55)", margin: "0 0 1rem" }}>tap any day to step inside that memory 🌸</p>
        {!loading && (
          <div style={{ display: "flex", gap: "0.65rem", justifyContent: "center", flexWrap: "wrap" }}>
            {[{ e: "📖", l: `${totalMem} memories` }, { e: "⭐", l: `${specialCnt} special days` }, { e: "🌸", l: `day ${daysSince} of us` }].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                style={{ background: "rgba(249,168,212,.14)", border: "1px solid rgba(249,168,212,.28)", borderRadius: 30, padding: "0.32rem 0.95rem", fontFamily: SANS, fontSize: "0.9rem", color: "#be185d" }}>
                {s.e} {s.l}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {thisMonthAnniv && (
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ maxWidth: 660, margin: "0 auto 1.5rem", position: "relative", zIndex: 2, background: "linear-gradient(135deg,#fef3c7,#fde68a)", border: "2px solid rgba(245,158,11,.4)", borderRadius: 18, padding: "1rem 1.4rem", display: "flex", alignItems: "center", gap: "0.8rem", boxShadow: "0 4px 24px rgba(245,158,11,.22)" }}>
            <motion.span style={{ fontSize: "1.8rem", flexShrink: 0 }} animate={{ rotate: [-8, 8, -8], scale: [1, 1.12, 1] }} transition={{ repeat: Infinity, duration: 2 }}>👑</motion.span>
            <div>
              <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "1rem", color: "#78350f", margin: 0, fontWeight: 700 }}>{monthsSince}-month anniversary this month! 🎉</p>
              <p style={{ fontFamily: SANS, fontSize: "0.78rem", color: "rgba(120,53,15,.6)", margin: "0.1rem 0 0" }}>tap the 11th to add a memory and celebrate 🌸</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 36 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.12 }}
        style={{ position: "relative", zIndex: 2, maxWidth: 660, margin: "0 auto" }}>
        <div style={{ background: "rgba(255,255,255,.93)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: 28, boxShadow: "0 16px 70px rgba(244,114,182,.18),0 4px 16px rgba(0,0,0,.05),inset 0 0 0 1.5px rgba(249,168,212,.32)", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.3rem 1.7rem", background: "linear-gradient(135deg,#2a0c1c,#461525)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, backgroundImage: GRAIN, pointerEvents: "none", opacity: 0.45 }} />
            <motion.div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,rgba(244,114,182,.06),transparent)", backgroundSize: "200% 100%" }}
              animate={{ backgroundPosition: ["200% 0", "-200% 0"] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} />
            <motion.button onClick={() => changeMonth(-1)} whileHover={{ scale: 1.18, x: -2 }} whileTap={{ scale: 0.88 }}
              style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(244,114,182,.18)", cursor: "pointer", width: 40, height: 40, borderRadius: "50%", color: "#f9a8d4", fontSize: "1.2rem", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}>‹</motion.button>
            <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
              <AnimatePresence mode="wait">
                <motion.p key={`${year}-${month}`}
                  initial={{ opacity: 0, y: slideDir > 0 ? -16 : 16, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: slideDir > 0 ? 16 : -16, filter: "blur(4px)" }}
                  transition={{ duration: 0.22 }}
                  style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "1.65rem", color: "#fce7f3", margin: 0, fontWeight: 400 }}>
                  {MONTHS[month]}
                </motion.p>
              </AnimatePresence>
              <p style={{ fontFamily: SANS, fontSize: "0.88rem", color: "rgba(252,231,243,.38)", margin: 0 }}>{year}</p>
            </div>
            <motion.button onClick={() => changeMonth(1)} whileHover={{ scale: 1.18, x: 2 }} whileTap={{ scale: 0.88 }}
              style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(244,114,182,.18)", cursor: "pointer", width: 40, height: 40, borderRadius: "50%", color: "#f9a8d4", fontSize: "1.2rem", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}>›</motion.button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", padding: "0.85rem 1.1rem 0.3rem", background: "rgba(253,186,213,.05)" }}>
            {DAYS_SHORT.map((d, i) => (
              <div key={i} style={{ textAlign: "center", fontFamily: SANS, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: i === 0 || i === 6 ? "rgba(236,72,153,.48)" : "rgba(190,24,93,.38)", padding: "0.28rem 0" }}>{d}</div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={`${year}-${month}`}
              initial={{ opacity: 0, x: slideDir > 0 ? 28 : -28 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: slideDir > 0 ? -18 : 18 }} transition={{ duration: 0.22, ease: "easeOut" }}
              style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, padding: "0.35rem 1.1rem 0.75rem" }}>
              {cells.map((day, i) => {
                if (!day) return <div key={i} />;
                const key = toKey(year, month, day);
                return (
                  <DayCell key={key} day={day} month={month} year={year} dateKey={key} entry={entries[key]}
                    isToday={day === today.getDate() && month === today.getMonth() && year === today.getFullYear()}
                    isOurs={inOurTime(key)} onClick={e => openDay(key, e)} />
                );
              })}
            </motion.div>
          </AnimatePresence>

          <div style={{ display: "flex", gap: "0.9rem", flexWrap: "wrap", justifyContent: "center", padding: "0.7rem 1.4rem 1.2rem", borderTop: "1px solid rgba(249,168,212,.12)", fontFamily: SANS, fontSize: "0.78rem", color: "rgba(190,24,93,.48)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 11, height: 11, borderRadius: 2, background: "linear-gradient(135deg,#fde68a,#f59e0b)" }} /> anniversary</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 11, height: 11, borderRadius: 2, background: "linear-gradient(135deg,#fda4af,#ec4899)" }} /> special</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>📸 photo</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "#f472b6" }} /> note</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 11, height: 11, borderRadius: 2, outline: "2px solid #f9a8d4", outlineOffset: 1 }} /> today</span>
          </div>
        </div>
      </motion.div>

      {loading && (
        <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,245,249,.8)", backdropFilter: "blur(6px)" }}>
          <motion.div animate={{ scale: [1, 1.18, 1], rotate: [0, 180, 360] }} transition={{ repeat: Infinity, duration: 1.4 }} style={{ fontSize: "2.5rem" }}>💗</motion.div>
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <DayView key={selected} dateKey={selected}
            entry={entries[selected] ?? { date: selected, note: "", photos: [], special: false, specialLabel: "", mood: "" }}
            originRect={originRect} onClose={() => setSelected(null)} onSave={handleSave} onDelete={handleDelete} />
        )}
      </AnimatePresence>
    </section>
  );
}