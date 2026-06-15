"use client";
import React, { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCalendarData, updateCalendarCache, deleteFromCalendarCache, type CalEntry } from "@/lib/calendarStore";
import { useEscKey } from "@/lib/useEscKey";

/* ─── types ─── */
interface DraftEntry extends Omit<CalEntry, "date"> {}

/* ─── constants ─── */
const MONTHS     = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_SHORT = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const DAYS_FULL  = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const SPECIAL_LABELS = ["🌹 First date","💗 Special moment","🌙 Late night talk","✈️ Adventure","🎂 Birthday","💌 Important","⭐ Favourite memory","🎶 Our song","🌸 Just us","🎮 Gaming night","🍜 Food date","🌃 Night out"];
const BIRTHDAYS: Record<string, string> = { "12-20": "🎂 Ankit's Birthday", "07-06": "🎂 Juhi's Birthday" };
const MOODS = ["🥰","😊","🥺","😂","🌙","💗","✨","🎮","🌷","😴","🤭","💫"];
// TODO: replace hardcoded start date with dynamic value from userStore.getStartDate()
const START = new Date("2026-03-11");

/* ─── stable per-decoration values — computed once, never on render ─── */
const DECO_SYMS   = ["💗","🌸","💕","🩷","✨"] as const;
const DECO_SIZES  = [2.0, 2.4, 2.1, 2.6, 2.2];   // rem, replaces Math.random()
const DECO_TOPS   = [15, 52, 30, 67, 41];          // %, replaces (i*37)%55
const ORBS = [
  { l: "5%",  t: "8%",  c: "rgba(var(--pink-rgb),.22)" },
  { l: "70%", t: "4%",  c: "rgba(var(--pink-rgb),.18)" },
  { l: "45%", t: "72%", c: "rgba(var(--pink-rgb),.12)" },
] as const;

function toKey(y: number, m: number, d: number) { return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`; }
function dayNum(key: string) { return Math.floor((new Date(key + "T12:00:00").getTime() - START.getTime()) / 86400000) + 1; }
function fmtDate(key: string) { const d = new Date(key + "T12:00:00"); return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`; }
function isVideoSrc(src: string) { return src.startsWith("data:video") || /\.(mp4|mov|webm)$/i.test(src); }

const SERIF  = `"Georgia", "Times New Roman", serif`;
const SCRIPT = `var(--font-caveat), "Segoe Script", cursive`;
const SANS   = `var(--font-lato), "Inter", system-ui, sans-serif`;
const GRAIN  = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`;

function isAcceptedMedia(file: File) {
  return file.type.startsWith("image/") || ["video/mp4", "video/quicktime", "video/webm"].includes(file.type);
}

/* ─── Cloudinary unsigned upload ─── */
const CLOUDINARY_CLOUD_NAME    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

async function uploadToCloudinary(file: File): Promise<string> {
  const isVideo  = file.type.startsWith("video/");
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${isVideo ? "video" : "image"}/upload`;
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(endpoint, { method: "POST", body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message || "Upload failed");
  }
  return ((await res.json()) as { secure_url: string }).secure_url;
}

/* ─── lightweight thumbnail URLs ───────────────────────────────────────────
   Inserts a Cloudinary transformation segment right after `/upload/` so
   thumbnails are small + compressed, and (for video) a static jpg frame —
   instead of loading the full original image/video for every grid item.
   This is the main fix for lag with many items. Full quality is only
   loaded in the Lightbox (uses the original `src`).
   ──────────────────────────────────────────────────────────────────────── */
function cldThumb(src: string, w = 200): string {
  if (!src.includes("res.cloudinary.com") || !src.includes("/upload/")) return src;
  if (isVideoSrc(src)) {
    return src
      .replace("/video/upload/", `/video/upload/so_0,w_${w},h_${w},c_fill,q_auto,f_jpg/`)
      .replace(/\.(mp4|mov|webm)$/i, ".jpg");
  }
  return src.replace("/upload/", `/upload/w_${w},h_${w},c_fill,q_auto,f_auto/`);
}

/* ─── media thumbnail (always renders a static <img>, never <video>) ─── */
function MediaThumb({ src, onClick }: { src: string; onClick: () => void }) {
  const isVid = isVideoSrc(src);
  return (
    <div style={{ position: "relative", cursor: "pointer", width: 64, height: 64 }} onClick={onClick}>
      <img src={cldThumb(src, 128)} loading="lazy" decoding="async" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, display: "block", border: "1px solid rgba(var(--pink-deep-rgb),.18)", background: "#1a0a12" }} alt="" />
      {isVid && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.3)", borderRadius: 8 }}>
          <span style={{ fontSize: "1.2rem" }}>▶</span>
        </div>
      )}
    </div>
  );
}

/* ─── lightbox (images + videos) — full quality, only one rendered at a time ─── */
function Lightbox({ media, startIdx, onClose }: { media: string[]; startIdx: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIdx);
  const prev = useCallback((e: React.MouseEvent) => { e.stopPropagation(); setIdx(i => (i - 1 + media.length) % media.length); }, [media.length]);
  const next = useCallback((e: React.MouseEvent) => { e.stopPropagation(); setIdx(i => (i + 1) % media.length); }, [media.length]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setIdx(i => (i - 1 + media.length) % media.length);
      if (e.key === "ArrowRight") setIdx(i => (i + 1) % media.length);
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [media.length, onClose]);

  const isVid = isVideoSrc(media[idx]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 9500, background: "rgba(4,0,2,.97)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      {media.length > 1 && (
        <motion.button onClick={prev} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          style={{ position: "absolute", left: "clamp(0.6rem,2.5vw,2rem)", background: "rgba(var(--pink-deep-rgb),.15)", border: "1px solid rgba(var(--pink-deep-rgb),.3)", borderRadius: "50%", width: 48, height: 48, cursor: "pointer", color: "var(--pink)", fontSize: "1.4rem", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</motion.button>
      )}
      <AnimatePresence mode="wait">
        <motion.div key={idx} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          onClick={e => e.stopPropagation()}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", maxWidth: "min(85vw,900px)" }}>
          {isVid ? (
            <video src={media[idx]} controls autoPlay playsInline preload="metadata" style={{ maxWidth: "100%", maxHeight: "75vh", borderRadius: 6, boxShadow: "0 20px 60px rgba(0,0,0,.9)", display: "block", background: "#000" }} />
          ) : (
            <img src={media[idx]} alt="" loading="eager" style={{ maxWidth: "100%", maxHeight: "75vh", objectFit: "contain", borderRadius: 6, boxShadow: "0 20px 60px rgba(0,0,0,.9)", display: "block" }} />
          )}
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {media.map((_, i) => (
              <div key={i} onClick={e => { e.stopPropagation(); setIdx(i); }} style={{ width: i === idx ? 10 : 6, height: i === idx ? 10 : 6, borderRadius: "50%", cursor: "pointer", background: i === idx ? "var(--pink-deep)" : "rgba(var(--pink-rgb),.35)", transition: "all 0.2s" }} />
            ))}
          </div>
          <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: "rgba(var(--pink-rgb),.4)", letterSpacing: "0.12em", margin: 0 }}>
            {idx + 1} / {media.length} &nbsp;·&nbsp; ← → to navigate &nbsp;·&nbsp; ESC to close
          </p>
        </motion.div>
      </AnimatePresence>
      {media.length > 1 && (
        <motion.button onClick={next} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          style={{ position: "absolute", right: "clamp(0.6rem,2.5vw,2rem)", background: "rgba(var(--pink-deep-rgb),.15)", border: "1px solid rgba(var(--pink-deep-rgb),.3)", borderRadius: "50%", width: 48, height: 48, cursor: "pointer", color: "var(--pink)", fontSize: "1.4rem", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>›</motion.button>
      )}
      <motion.button onClick={onClose} whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
        style={{ position: "absolute", top: "1rem", right: "1rem", background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", borderRadius: "50%", width: 38, height: 38, cursor: "pointer", color: "rgba(255,255,255,.7)", fontSize: "1rem", zIndex: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</motion.button>
    </motion.div>
  );
}

/* ─── polaroid card — renders thumbnail only; videos show a play badge ─── */
function Polaroid({ src, dateKey, idx, total, isTop, offset, onClick, onBringForward }: {
  src: string; dateKey: string; idx: number; total: number;
  isTop: boolean; offset: number; onClick: () => void; onBringForward: () => void;
}) {
  const isVid = isVideoSrc(src);
  // Only the top card and its immediate neighbors render at all — far cards
  // in a 15-item stack are pure visual clutter and cost a full <img> decode.
  if (Math.abs(offset) > 2) return null;
  return (
    <motion.div
      style={{ position: "absolute", width: "100%", height: "100%", background: "#fefefe", padding: "10px 10px 52px", cursor: "pointer", zIndex: total - Math.abs(offset), boxShadow: isTop ? "0 24px 70px rgba(0,0,0,.65),0 6px 20px rgba(var(--pink-deep-rgb),.2)" : "0 8px 28px rgba(0,0,0,.45)" }}
      animate={{ rotate: isTop ? 0 : offset * 6, x: isTop ? 0 : offset * 18, y: isTop ? 0 : Math.abs(offset) * 6, scale: isTop ? 1 : 1 - Math.abs(offset) * 0.05 }}
      whileHover={isTop ? { scale: 1.03, y: -6 } : { scale: 1.01 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      onClick={isTop ? onClick : onBringForward}
    >
      <div style={{ width: "100%", paddingBottom: "100%", position: "relative", overflow: "hidden", background: "#e8d5dc" }}>
        <img src={cldThumb(src, 360)} loading={isTop ? "eager" : "lazy"} decoding="async" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        {isVid && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.25)" }}>
            <span style={{ fontSize: "2rem", filter: "drop-shadow(0 2px 8px rgba(0,0,0,.5))" }}>▶</span>
          </div>
        )}
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 52, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 2 }}>
        <span style={{ fontFamily: "monospace", fontSize: "0.68rem", color: "rgba(80,40,60,.5)", letterSpacing: "0.14em", fontWeight: 700 }}>{fmtDate(dateKey)}</span>
        {total > 1 && <span style={{ fontFamily: "monospace", fontSize: "0.55rem", color: "rgba(80,40,60,.32)", letterSpacing: "0.08em" }}>{idx + 1} / {total}</span>}
      </div>
    </motion.div>
  );
}

/* ─── polaroid stack ─── */
function PolaroidStack({ media, dateKey, onMediaClick }: { media: string[]; dateKey: string; onMediaClick: (i: number) => void }) {
  const [topIdx, setTopIdx] = useState(0);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2.5rem", width: "100%" }}>
      <div style={{ position: "relative", width: "min(300px,70vw)", aspectRatio: "1 / 1.24", flexShrink: 0 }}>
        <div style={{ position: "absolute", inset: 0 }}>
          {media.map((src, i) => (
            <Polaroid key={i} src={src} dateKey={dateKey} idx={i} total={media.length}
              isTop={i === topIdx} offset={i - topIdx}
              onClick={() => onMediaClick(i)} onBringForward={() => setTopIdx(i)} />
          ))}
        </div>
      </div>
      {media.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <motion.button onClick={() => setTopIdx(i => (i - 1 + media.length) % media.length)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            style={{ background: "rgba(var(--pink-deep-rgb),.1)", border: "1px solid rgba(var(--pink-deep-rgb),.25)", borderRadius: "50%", width: 38, height: 38, cursor: "pointer", color: "var(--pink)", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</motion.button>
          <div style={{ display: "flex", gap: "0.45rem", alignItems: "center" }}>
            {media.map((_, i) => (
              <div key={i} onClick={() => setTopIdx(i)} style={{ width: i === topIdx ? 9 : 5, height: i === topIdx ? 9 : 5, borderRadius: "50%", cursor: "pointer", background: i === topIdx ? "var(--pink-deep)" : "rgba(var(--pink-rgb),.3)", transition: "all 0.2s" }} />
            ))}
          </div>
          <motion.button onClick={() => setTopIdx(i => (i + 1) % media.length)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            style={{ background: "rgba(var(--pink-deep-rgb),.1)", border: "1px solid rgba(var(--pink-deep-rgb),.25)", borderRadius: "50%", width: 38, height: 38, cursor: "pointer", color: "var(--pink)", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>›</motion.button>
        </div>
      )}
      <p style={{ fontFamily: SANS, fontSize: "0.78rem", color: "rgba(var(--pink-rgb),.35)", margin: 0, textAlign: "center" }}>
        {media.length > 1 ? "tap to open · tap back card to bring forward" : "tap to open full screen"}
      </p>
    </div>
  );
}

/* ─── film strip — renders thumbnails only, lazy-loaded ─── */
function FilmStrip({ media, dateKey, onMediaClick }: { media: string[]; dateKey: string; onMediaClick: (i: number) => void }) {
  return (
    <div style={{ display: "flex", gap: "1rem", overflowX: "auto", paddingBottom: "1.5rem", paddingTop: "0.5rem", scrollbarWidth: "none" } as React.CSSProperties}>
      {media.map((src, i) => {
        const rot = (i - (media.length - 1) / 2) * 3;
        const isVid = isVideoSrc(src);
        return (
          <motion.div key={i}
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.3, ease: "easeOut" }}
            whileHover={{ scale: 1.06, y: -6 }}
            onClick={() => onMediaClick(i)}
            style={{ cursor: "pointer", flexShrink: 0, position: "relative", background: "#110507", padding: "7px 7px 28px", boxShadow: "0 16px 40px rgba(0,0,0,.65)", width: 140, transform: `rotate(${rot}deg)` }}
          >
            {[0, 1, 2, 3].map(h => (
              <React.Fragment key={h}>
                <div style={{ position: "absolute", top: 4 + h * 21, left: 2, width: 5, height: 12, borderRadius: 2, background: "#000" }} />
                <div style={{ position: "absolute", top: 4 + h * 21, right: 2, width: 5, height: 12, borderRadius: 2, background: "#000" }} />
              </React.Fragment>
            ))}
            <div style={{ width: "100%", aspectRatio: "1", position: "relative", overflow: "hidden" }}>
              <img src={cldThumb(src, 280)} loading="lazy" decoding="async" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: "saturate(0.9)" }} />
              {isVid && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.3)" }}>
                  <span style={{ fontSize: "1.5rem" }}>▶</span>
                </div>
              )}
            </div>
            <div style={{ position: "absolute", bottom: 4, left: 0, right: 0, textAlign: "center", fontFamily: "monospace", fontSize: "0.58rem", color: "rgba(255,170,150,.4)", letterSpacing: "0.1em" }}>
              {fmtDate(dateKey)} · {String(i + 1).padStart(2, "0")}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ─── upload zone ───────────────────────────────────────────────────────────
   Mobile (iOS Safari) fixes applied:
   1. <label htmlFor> wired to hidden <input> — the ONLY reliable way to open
      the native picker inside a modal on iOS 15-17. input.click() from JS is
      silently blocked by WebKit inside portals/fixed-position containers.
   2. Separate inputs for images vs video — iOS ignores `multiple` on video
      inputs and may break the picker when accept mixes types.
   3. Drag & drop preserved for desktop, but NOT required for mobile to work.
   4. Paste support via window paste event.
   ────────────────────────────────────────────────────────────────────────── */
function MediaUploadZone({ onFiles, busy }: { onFiles: (files: File[]) => void; busy?: boolean }) {
  const [dragging, setDragging] = useState(false);
  // Stable IDs — not generated per render
  const imgId = "cal-upload-img";
  const vidId = "cal-upload-vid";

  const processFiles = useCallback((raw: FileList | File[]) => {
    const accepted = Array.from(raw).filter(isAcceptedMedia);
    if (accepted.length) onFiles(accepted);
  }, [onFiles]);

  /* Drag & drop — desktop only, degrades gracefully on mobile */
  const onDragOver  = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(true); }, []);
  const onDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(false); }, []);
  const onDrop      = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false); processFiles(e.dataTransfer.files);
  }, [processFiles]);

  /* Paste — uses clipboardData.items only (avoids double-paste duplicates) */
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const files = Array.from(e.clipboardData.items)
        .filter(it => it.kind === "file")
        .map(it => it.getAsFile())
        .filter((f): f is File => !!f && isAcceptedMedia(f));
      if (files.length) onFiles(files);
    };
    window.addEventListener("paste", handler);
    return () => window.removeEventListener("paste", handler);
  }, [onFiles]);

  /* Visually hidden but accessible — keeps input in the tap/a11y tree */
  const hiddenInput: React.CSSProperties = {
    position: "absolute", width: 1, height: 1, opacity: 0,
    overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap",
  };

  const labelBtn: React.CSSProperties = {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
    padding: "0.75rem 0.5rem", borderRadius: 10,
    cursor: busy ? "wait" : "pointer",
    fontFamily: SANS, fontSize: "0.85rem",
    border: "1px solid rgba(var(--pink-deep-rgb),.22)",
    background: "rgba(var(--pink-deep-rgb),.06)", color: "rgba(var(--pink-rgb),.75)",
    opacity: busy ? 0.55 : 1,
    userSelect: "none", WebkitUserSelect: "none",
    transition: "opacity 0.15s",
  } as React.CSSProperties;

  return (
    <div>
      {/* Drag-and-drop zone — desktop; on mobile just shows hint text */}
      <div
        onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
        style={{
          width: "100%", padding: "1.1rem 1rem", marginBottom: "0.5rem",
          border: `1.5px dashed ${dragging ? "rgba(var(--pink-deep-rgb),.7)" : "rgba(var(--pink-deep-rgb),.25)"}`,
          borderRadius: 12, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: "0.35rem",
          background: dragging ? "rgba(var(--pink-deep-rgb),.1)" : "rgba(var(--pink-deep-rgb),.04)",
          opacity: busy ? 0.6 : 1,
          transition: "border-color 0.15s, background 0.15s",
          pointerEvents: busy ? "none" : "auto",
        }}
      >
        <span style={{ fontSize: "1.5rem" }}>{busy ? "⏳" : dragging ? "📂" : "🌸"}</span>
        <span style={{ fontFamily: SANS, fontSize: "0.83rem", color: "rgba(var(--pink-rgb),.6)", textAlign: "center" }}>
          {busy ? "Uploading…" : dragging ? "Drop to add!" : "Drag & drop here · or paste (⌘V)"}
        </span>
        <span style={{ fontFamily: SANS, fontSize: "0.68rem", color: "rgba(var(--pink-rgb),.32)" }}>
          JPG · PNG · HEIC · GIF · MP4 · MOV
        </span>
      </div>

      {/* ── Pick buttons — label+input pairs, the only mobile-safe approach ── */}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        {/* Images — multiple OK on iOS for images */}
        <input id={imgId} type="file" accept="image/*" multiple disabled={busy}
          style={hiddenInput}
          onChange={e => { if (e.target.files?.length) processFiles(e.target.files); e.currentTarget.value = ""; }} />
        <label htmlFor={imgId} style={labelBtn}>📸 Photos</label>

        {/* Videos — NO multiple; iOS silently breaks the picker with it */}
        <input id={vidId} type="file" accept="video/mp4,video/quicktime,video/webm" disabled={busy}
          style={hiddenInput}
          onChange={e => { if (e.target.files?.length) processFiles(e.target.files); e.currentTarget.value = ""; }} />
        <label htmlFor={vidId} style={labelBtn}>🎬 Videos</label>
      </div>
    </div>
  );
}

/* ─── day view portal ─── */
function DayView({ dateKey, entry, originRect, onClose, onSave, onDelete, birthdayLabel }: {
  dateKey: string; entry: Partial<CalEntry>; originRect: DOMRect | null;
  onClose: () => void; onSave: (d: DraftEntry) => Promise<void>; onDelete: () => Promise<void>;
  birthdayLabel?: string | null;
}) {
  const [draft, setDraft] = useState<DraftEntry>({
    note: entry.note || "", photos: entry.photos || [],
    special: entry.special || false, specialLabel: entry.specialLabel || "",
    mood: entry.mood || "", pinnedNote: entry.pinnedNote || "",
  });
  const [tab,      setTab]      = useState<"view" | "edit">((entry.note || (entry.photos?.length ?? 0) > 0) ? "view" : "edit");
  const [saving,   setSaving]   = useState(false);
  const [lbIdx,    setLbIdx]    = useState<number | null>(null);
  const [dispMode, setDispMode] = useState<"polaroid" | "film">("polaroid");
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  const displayDate = new Date(dateKey + "T12:00:00");
  const isOurs      = displayDate >= START;
  const dn          = isOurs ? dayNum(dateKey) : null;
  const hasContent  = !!(draft.note || (draft.photos?.length ?? 0) > 0);
  const hasMedia    = (draft.photos?.length ?? 0) > 0;

  /* Upload each file to Cloudinary, append returned URL to draft */
  const handleFiles = useCallback(async (files: File[]) => {
    setUploadErr(null);
    setUploading(true);
    try {
      for (const file of files) {
        const url = await uploadToCloudinary(file);
        setDraft(d => ({ ...d, photos: [...(d.photos || []), url] }));
      }
    } catch (err: any) {
      setUploadErr(err?.message || "Upload failed — please try again.");
    } finally {
      setUploading(false);
    }
  }, []);

  const removeMedia = (i: number) => setDraft(d => ({ ...d, photos: (d.photos || []).filter((_, idx) => idx !== i) }));
  const save = async () => { setSaving(true); await onSave(draft); setSaving(false); };

  // ESC closes the day view, but only when the lightbox isn't open (lightbox handles its own ESC)
  useEscKey(onClose, lbIdx === null);

  const ox = originRect ? originRect.left + originRect.width  / 2 - window.innerWidth  / 2 : 0;
  const oy = originRect ? originRect.top  + originRect.height / 2 - window.innerHeight / 2 : 0;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(6,1,4,.88)" }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.08, borderRadius: 999, x: ox, y: oy }}
        animate={{ opacity: 1, scale: 1, borderRadius: 18, x: 0, y: 0 }}
        exit={{ opacity: 0, scale: 0.06, borderRadius: 999 }}
        transition={{ type: "spring", stiffness: 230, damping: 30, mass: 0.8 }}
        style={{
          position: "fixed", top: "2vh", left: "2vw", right: "2vw", bottom: "2vh", zIndex: 3001,
          background: "linear-gradient(148deg,#17060f 0%,#280c1a 50%,#190810 100%)",
          backgroundImage: `${GRAIN},linear-gradient(148deg,#17060f 0%,#280c1a 50%,#190810 100%)`,
          display: "flex", flexDirection: "column", overflow: "hidden",
          boxShadow: "0 30px 100px rgba(0,0,0,.9),0 0 0 1px rgba(var(--pink-deep-rgb),.1)",
        }}
      >
        {/* ── Header ── */}
        <div style={{ padding: "clamp(1rem,3vw,1.8rem) clamp(1rem,3vw,2rem) clamp(0.8rem,2vw,1.2rem)", borderBottom: "1px solid rgba(var(--pink-deep-rgb),.1)", background: "linear-gradient(180deg,rgba(var(--pink-deep-rgb),.06) 0%,transparent)", flexShrink: 0, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.8rem" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            {birthdayLabel && (
              <motion.span
                animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 2 }}
                style={{ fontFamily: SANS, fontSize: "0.82rem", fontWeight: 700, color: "#fbbf24", display: "block", marginBottom: "0.25rem", letterSpacing: "0.04em" }}>
                {birthdayLabel}! 🎉
              </motion.span>
            )}
            {dn && <span style={{ fontFamily: SANS, fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(var(--pink-rgb),.4)", display: "block", marginBottom: "0.3rem" }}>day {dn} of us 🌸</span>}
            <h2 style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "clamp(1.1rem,3.5vw,1.8rem)", color: "var(--pink-light)", margin: 0, lineHeight: 1.25, fontWeight: 400 }}>
              {DAYS_FULL[displayDate.getDay()]}, {MONTHS[displayDate.getMonth()]} {displayDate.getDate()}, {displayDate.getFullYear()}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "0.35rem", flexWrap: "wrap" }}>
              {entry.specialLabel && <span style={{ fontFamily: SANS, fontSize: "0.82rem", color: "var(--pink)" }}>{entry.specialLabel}</span>}
              {draft.mood && <span style={{ fontSize: "1.3rem", lineHeight: 1 }}>{draft.mood}</span>}
              <span style={{ fontFamily: "monospace", fontSize: "0.68rem", color: "rgba(var(--pink-rgb),.3)", letterSpacing: "0.1em" }}>{fmtDate(dateKey)}</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
            {hasContent && (
              <div style={{ background: "rgba(255,255,255,.05)", borderRadius: 28, padding: "0.18rem", display: "flex", border: "1px solid rgba(var(--pink-deep-rgb),.15)" }}>
                {(["view", "edit"] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    style={{ padding: "0.28rem 0.85rem", borderRadius: 24, border: "none", fontFamily: SANS, fontSize: "0.82rem", cursor: "pointer", transition: "all 0.2s", background: tab === t ? "linear-gradient(135deg,rgba(var(--pink-deep-rgb),.4),rgba(var(--pink-deep-rgb),.3))" : "transparent", color: tab === t ? "var(--pink-light)" : "rgba(var(--pink-light-rgb),.35)" }}>
                    {t === "view" ? "💌 memory" : "✏️ edit"}
                  </button>
                ))}
              </div>
            )}
            <motion.button onClick={onClose} whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
              style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(var(--pink-deep-rgb),.15)", borderRadius: "50%", width: 34, height: 34, cursor: "pointer", color: "rgba(var(--pink-light-rgb),.6)", fontSize: "0.95rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</motion.button>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
          <AnimatePresence mode="wait">

            {/* VIEW */}
            {tab === "view" && (
              <motion.div key="view" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22, ease: "easeOut" }} style={{ padding: "clamp(1.2rem,3vw,2rem)", minHeight: "100%" }}>
                {hasMedia && (
                  <div style={{ marginBottom: "1.8rem" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.2rem" }}>
                      <span style={{ fontFamily: SANS, fontSize: "0.75rem", color: "rgba(var(--pink-rgb),.5)", letterSpacing: "0.12em", textTransform: "uppercase" }}>{draft.photos!.length} item{draft.photos!.length !== 1 ? "s" : ""}</span>
                      <div style={{ display: "flex", gap: "0.35rem" }}>
                        {(["polaroid", "film"] as const).map(m => (
                          <button key={m} onClick={() => setDispMode(m)}
                            style={{ padding: "0.25rem 0.75rem", borderRadius: 18, cursor: "pointer", transition: "all 0.2s", fontFamily: SANS, fontSize: "0.78rem", border: `1px solid ${dispMode === m ? "rgba(var(--pink-deep-rgb),.45)" : "rgba(var(--pink-deep-rgb),.18)"}`, background: dispMode === m ? "rgba(var(--pink-deep-rgb),.15)" : "transparent", color: dispMode === m ? "var(--pink)" : "rgba(var(--pink-rgb),.38)" }}>
                            {m === "polaroid" ? "🖼 polaroid" : "🎞 film"}
                          </button>
                        ))}
                      </div>
                    </div>
                    {dispMode === "polaroid"
                      ? <PolaroidStack media={draft.photos!} dateKey={dateKey} onMediaClick={i => setLbIdx(i)} />
                      : <FilmStrip    media={draft.photos!} dateKey={dateKey} onMediaClick={i => setLbIdx(i)} />
                    }
                  </div>
                )}
                {draft.note ? (
                  <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(var(--pink-deep-rgb),.08)", borderRadius: 14, padding: "clamp(1.2rem,3vw,1.8rem) clamp(1.2rem,3vw,1.8rem) clamp(1.2rem,3vw,1.8rem) clamp(2rem,4vw,2.5rem)", position: "relative", overflow: "hidden", marginTop: hasMedia ? "2rem" : "0" }}>
                    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "repeating-linear-gradient(transparent,transparent 31px,rgba(var(--pink-deep-rgb),.05) 31px,rgba(var(--pink-deep-rgb),.05) 32px)" }} />
                    <div style={{ position: "absolute", left: "2.5rem", top: 0, bottom: 0, width: 1, background: "rgba(var(--pink-deep-rgb),.09)" }} />
                    <p style={{ fontFamily: SERIF, fontSize: "clamp(1rem,2.2vw,1.18rem)", color: "rgba(var(--pink-light-rgb),.88)", lineHeight: 2, margin: 0, whiteSpace: "pre-wrap", position: "relative", zIndex: 1, letterSpacing: "0.01em", fontWeight: 400 }}>{draft.note}</p>
                    <div style={{ marginTop: "1.4rem", display: "flex", alignItems: "center", gap: "0.5rem", position: "relative", zIndex: 1 }}>
                      <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,rgba(var(--pink-deep-rgb),.28),transparent)" }} />
                      <span style={{ fontFamily: SCRIPT, fontSize: "0.85rem", color: "rgba(var(--pink-rgb),.4)" }}>— with love 🩷</span>
                    </div>
                  </div>
                ) : !hasMedia && (
                  <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "0.8rem", opacity: 0.4 }}>🌸</div>
                    <p style={{ fontFamily: SANS, fontSize: "0.95rem", color: "rgba(var(--pink-rgb),.3)", margin: 0 }}>nothing here yet — tap edit to add a memory</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* EDIT */}
            {(tab === "edit" || !hasContent) && (
              <motion.div key="edit" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22, ease: "easeOut" }} style={{ padding: "clamp(1.2rem,3vw,2rem)", display: "flex", flexDirection: "column", gap: "1.4rem" }}>

                {/* Mood */}
                <div>
                  <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: "rgba(var(--pink-rgb),.45)", marginBottom: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase" }}>How are you feeling?</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
                    {MOODS.map(m => (
                      <motion.button key={m} onClick={() => setDraft(d => ({ ...d, mood: d.mood === m ? "" : m }))}
                        whileHover={{ scale: 1.18, y: -3 }} whileTap={{ scale: 0.9 }}
                        style={{ fontSize: "1.5rem", background: draft.mood === m ? "rgba(var(--pink-deep-rgb),.18)" : "rgba(255,255,255,.04)", border: `1.5px solid ${draft.mood === m ? "rgba(var(--pink-deep-rgb),.55)" : "rgba(255,255,255,.06)"}`, borderRadius: 10, padding: "0.35rem", cursor: "pointer", transition: "all 0.15s" }}>{m}</motion.button>
                    ))}
                  </div>
                </div>

                {/* Media */}
                <div>
                  <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: "rgba(var(--pink-rgb),.45)", marginBottom: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase" }}>Photos &amp; Videos</p>
                  {(draft.photos || []).length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", marginBottom: "0.8rem" }}>
                      {draft.photos!.map((src, i) => (
                        <div key={i} style={{ position: "relative" }}>
                          <MediaThumb src={src} onClick={() => setLbIdx(i)} />
                          <button onClick={() => removeMedia(i)}
                            style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", border: "none", background: "var(--pink-deep)", color: "#fff", fontSize: "0.6rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <MediaUploadZone onFiles={handleFiles} busy={uploading} />
                  {uploadErr && <p style={{ fontFamily: SANS, fontSize: "0.78rem", color: "#fb7185", marginTop: "0.5rem", textAlign: "center" }}>{uploadErr}</p>}
                </div>

                {/* Note */}
                <div>
                  <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: "rgba(var(--pink-rgb),.45)", marginBottom: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase" }}>Journal</p>
                  <textarea value={draft.note} onChange={e => setDraft(d => ({ ...d, note: e.target.value }))}
                    placeholder={"Write about this day…\n\nHow did it feel? What do you want to remember? 🌸"}
                    rows={6}
                    style={{ width: "100%", padding: "1rem 1rem 1rem 1.4rem", background: "rgba(255,255,255,.03)", border: "1px solid rgba(var(--pink-deep-rgb),.16)", borderRadius: 12, resize: "vertical", fontFamily: SERIF, fontSize: "clamp(0.95rem,2.2vw,1.1rem)", color: "rgba(var(--pink-light-rgb),.85)", outline: "none", boxSizing: "border-box", lineHeight: 1.9, caretColor: "var(--pink)", letterSpacing: "0.01em" }} />
                </div>

                {/* Special */}
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.7rem", cursor: "pointer", marginBottom: "0.8rem" }} onClick={() => setDraft(d => ({ ...d, special: !d.special }))}>
                    <div style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, border: `2px solid ${draft.special ? "var(--pink-deep)" : "rgba(var(--pink-deep-rgb),.28)"}`, background: draft.special ? "linear-gradient(135deg,var(--pink-deep),var(--pink-deep))" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                      {draft.special && <span style={{ color: "#fff", fontSize: "0.7rem" }}>✓</span>}
                    </div>
                    <span style={{ fontFamily: SANS, fontSize: "0.92rem", color: "rgba(var(--pink-light-rgb),.72)" }}>Mark as a special day ⭐</span>
                  </label>
                  <AnimatePresence>
                    {draft.special && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", overflow: "hidden" }}>
                        {SPECIAL_LABELS.map(lbl => (
                          <button key={lbl} onClick={() => setDraft(d => ({ ...d, specialLabel: d.specialLabel === lbl ? "" : lbl }))}
                            style={{ padding: "0.28rem 0.7rem", borderRadius: 18, cursor: "pointer", fontFamily: SANS, fontSize: "0.82rem", border: `1.5px solid ${draft.specialLabel === lbl ? "var(--pink-deep)" : "rgba(var(--pink-deep-rgb),.2)"}`, background: draft.specialLabel === lbl ? "rgba(var(--pink-deep-rgb),.2)" : "rgba(255,255,255,.04)", color: draft.specialLabel === lbl ? "var(--pink)" : "rgba(var(--pink-rgb),.45)", transition: "all 0.15s" }}>{lbl}</button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "0.8rem", paddingBottom: "1rem" }}>
                  <motion.button onClick={save} disabled={saving || uploading}
                    whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.97 }}
                    style={{ flex: 1, padding: "0.95rem", borderRadius: 12, border: "none", cursor: (saving || uploading) ? "wait" : "pointer", background: "linear-gradient(135deg,var(--pink-deep),var(--pink-deep))", color: "#fff", fontFamily: SANS, fontSize: "1rem", fontWeight: 600, boxShadow: "0 4px 20px rgba(var(--pink-deep-rgb),.35)", opacity: (saving || uploading) ? 0.7 : 1 }}>
                    {saving ? "Saving…" : uploading ? "Uploading…" : "Save memory 💗"}
                  </motion.button>
                  {hasContent && (
                    <motion.button onClick={async () => { await onDelete(); }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      style={{ padding: "0.95rem 1.2rem", borderRadius: 12, border: "1px solid rgba(var(--pink-deep-rgb),.2)", cursor: "pointer", background: "rgba(255,255,255,.03)", color: "rgba(var(--pink-rgb),.5)", fontFamily: SANS, fontSize: "0.9rem" }}>Clear</motion.button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <AnimatePresence>
        {lbIdx !== null && <Lightbox media={draft.photos!} startIdx={lbIdx} onClose={() => setLbIdx(null)} />}
      </AnimatePresence>
    </>
  );
}

/* ─── main calendar ─── */
export default function OurCalendar({ initialDate }: { initialDate?: string }) {
  const { data: calData, loading } = useCalendarData();

  const today = new Date();
  const initD = initialDate ? new Date(initialDate + "T12:00:00") : null;
  const [year,       setYear]       = useState(initD ? initD.getFullYear() : today.getFullYear());
  const [month,      setMonth]      = useState(initD ? initD.getMonth()    : today.getMonth());
  const [selected,   setSelected]   = useState<string | null>(initialDate || null);
  const [originRect, setOriginRect] = useState<DOMRect | null>(null);
  const [flipDir,    setFlipDir]    = useState<"left" | "right" | null>(null);

  const isOnToday = year === today.getFullYear() && month === today.getMonth();
  const goToToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

  const entries = useMemo(() => {
    const map: Record<string, CalEntry> = {};
    calData.forEach(e => { map[e.date] = e; });
    return map;
  }, [calData]);

  const changeMonth = (dir: "left" | "right") => {
    setFlipDir(dir);
    setTimeout(() => {
      if (dir === "left") { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }
      else { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }
      setFlipDir(null);
    }, 240);
  };

  const openDay = (key: string, e: React.MouseEvent<HTMLButtonElement>) => {
    setOriginRect(e.currentTarget.getBoundingClientRect());
    setSelected(key);
  };

  const handleSave = useCallback(async (draft: DraftEntry) => {
    if (!selected) return;
    const payload: CalEntry = { date: selected, note: draft.note || "", photos: draft.photos || [], special: draft.special || false, specialLabel: draft.specialLabel || "", mood: draft.mood || "", pinnedNote: draft.pinnedNote || "" };
    await fetch("/api/calendar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    updateCalendarCache(payload);
    setSelected(null);
  }, [selected]);

  const handleDelete = useCallback(async () => {
    if (!selected) return;
    await fetch("/api/calendar", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: selected }) });
    deleteFromCalendarCache(selected);
    setSelected(null);
  }, [selected]);

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const totalMem   = Object.keys(entries).length;
  const specialCnt = Object.values(entries).filter(e => e.special).length;

  return (
    <section id="calendar" style={{ position: "relative", width: "100%", minHeight: "100vh", padding: "clamp(4rem,7vw,6rem) clamp(1rem,3vw,2rem) clamp(4rem,7vw,6rem)", background: "linear-gradient(180deg,var(--rose) 0%,var(--pink-light) 30%,#fad0e8 60%,#f0a8cc 85%,#c9447a 100%)", overflow: "hidden" }}>
      {DECO_SYMS.map((sym, i) => (
        <span key={i} className="occ-deco"
          style={{ left: `${8 + i * 18}%`, top: `${DECO_TOPS[i]}%`, fontSize: `${DECO_SIZES[i]}rem`, "--occ-dur": `${4 + i * 1.2}s`, "--occ-del": `${i * 0.8}s` } as React.CSSProperties}>
          {sym}
        </span>
      ))}
      {ORBS.map((o, i) => (
        <div key={i}
          style={{ position: "absolute", left: o.l, top: o.t, width: "clamp(200px,28vw,360px)", height: "clamp(200px,28vw,360px)", borderRadius: "50%", background: o.c, filter: "blur(50px)", pointerEvents: "none", zIndex: 0, opacity: 0.7 }} />
      ))}

      <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: "center", marginBottom: "clamp(2rem,4vw,3.5rem)", position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", marginBottom: "1rem" }}>
          <div style={{ width: 60, height: 1, background: "linear-gradient(90deg,transparent,rgba(var(--pink-deep-rgb),.4))" }} />
          <span className="occ-heart">💗</span>
          <div style={{ width: 60, height: 1, background: "linear-gradient(90deg,rgba(var(--pink-deep-rgb),.4),transparent)" }} />
        </div>
        <h2 style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "clamp(2rem,5vw,3rem)", color: "var(--pink-deep)", margin: "0 0 0.5rem", fontWeight: 400, textShadow: "0 2px 16px rgba(var(--pink-deep-rgb),.15)" }}>our days together</h2>
        <p style={{ fontFamily: SANS, fontSize: "clamp(0.88rem,2vw,1rem)", color: "rgba(var(--pink-deep-rgb),.55)", margin: "0 0 1.2rem", lineHeight: 1.6 }}>every day logged, every moment saved 🌸</p>
        <div style={{ display: "flex", gap: "0.6rem", justifyContent: "center", flexWrap: "wrap" }}>
          {[{ label: `${totalMem} memories`, e: "📖" }, { label: `${specialCnt} special days`, e: "⭐" }, { label: `Day ${Math.floor((today.getTime() - START.getTime()) / 86400000) + 1} of us`, e: "🌸" }].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              className="dk-cal-chip"
              style={{ background: "rgba(255,255,255,.6)", border: "1px solid rgba(var(--pink-deep-rgb),.2)", borderRadius: 30, padding: "0.35rem 1rem", fontFamily: SANS, fontSize: "0.82rem", color: "var(--pink-deep)", backdropFilter: "blur(8px)", boxShadow: "0 2px 12px rgba(var(--pink-deep-rgb),.08)" }}>
              {s.e} {s.label}
            </motion.div>
          ))}
        </div>
      </motion.div>

      <div style={{ position: "relative", zIndex: 2, maxWidth: 780, margin: "0 auto" }}>
        <motion.div animate={{ rotateY: flipDir === "right" ? -12 : flipDir === "left" ? 12 : 0, scale: flipDir ? 0.97 : 1, opacity: flipDir ? 0.6 : 1 }} transition={{ duration: 0.24, ease: "easeInOut" }}
          className="dk-cal-card"
          style={{ background: "var(--cal-card-bg)", borderRadius: 28, overflow: "hidden", transformStyle: "preserve-3d", perspective: 1000, boxShadow: "var(--cal-card-shadow)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.2rem 1.6rem", background: "linear-gradient(135deg,#2d0f1e,#4a1628)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, backgroundImage: GRAIN, pointerEvents: "none", opacity: 0.5 }} />
            <motion.button onClick={() => changeMonth("left")} whileHover={{ scale: 1.18, x: -2 }} whileTap={{ scale: 0.9 }} style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(var(--pink-rgb),.18)", cursor: "pointer", width: 38, height: 38, borderRadius: "50%", color: "var(--pink)", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}>‹</motion.button>
            <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
              <AnimatePresence mode="wait">
                <motion.p key={`${year}-${month}`} initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.22 }} style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "clamp(1.2rem,3vw,1.6rem)", color: "var(--pink-light)", margin: 0, fontWeight: 400 }}>{MONTHS[month]}</motion.p>
              </AnimatePresence>
              <p style={{ fontFamily: SANS, fontSize: "0.85rem", color: "rgba(var(--pink-light-rgb),.4)", margin: 0 }}>{year}</p>
              {!isOnToday && (
                <motion.button onClick={goToToday} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }}
                  style={{ marginTop: "0.3rem", padding: "0.18rem 0.7rem", borderRadius: 20, border: "1px solid rgba(var(--pink-rgb),.3)", background: "rgba(var(--pink-rgb),.12)", color: "rgba(var(--pink-light-rgb),.7)", fontFamily: SANS, fontSize: "0.62rem", cursor: "pointer", letterSpacing: "0.06em" }}>
                  today
                </motion.button>
              )}
            </div>
            <motion.button onClick={() => changeMonth("right")} whileHover={{ scale: 1.18, x: 2 }} whileTap={{ scale: 0.9 }} style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(var(--pink-rgb),.18)", cursor: "pointer", width: 38, height: 38, borderRadius: "50%", color: "var(--pink)", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}>›</motion.button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", padding: "1rem 1.4rem 0.4rem", background: "var(--cal-dayhdr-bg)" }}>
            {DAYS_SHORT.map((d, i) => (<div key={i} style={{ textAlign: "center", fontFamily: SANS, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: i === 0 || i === 6 ? "rgba(var(--pink-deep-rgb),.5)" : "rgba(var(--pink-deep-rgb),.4)", padding: "0.3rem 0" }}>{d}</div>))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={`${year}-${month}`} initial={{ opacity: 0, x: flipDir === "right" ? 28 : -28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.24, ease: "easeOut" }} style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, padding: "0.4rem 1.4rem 1rem" }}>
              {cells.map((day, i) => {
                if (!day) return <div key={i} />;
                const key = toKey(year, month, day);
                const entry = entries[key];
                const isToday    = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                const isSpecial  = !!entry?.special;
                const hasMedia   = (entry?.photos?.length ?? 0) > 0;
                const hasNote    = !!entry?.note;
                const hasVideo   = hasMedia && entry.photos!.some(isVideoSrc);
                const inOurTime  = new Date(key + "T12:00:00") >= START;
                const bdayLabel  = BIRTHDAYS[`${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`] ?? null;
                const isBirthday = !!bdayLabel;
                return (
                  <button key={key} onClick={e => openDay(key, e)} className="occ-day"
                    style={{ background: isBirthday ? "linear-gradient(135deg,#fde68a,#f59e0b)" : isSpecial ? "linear-gradient(135deg,var(--pink),var(--pink-deep))" : isToday ? "linear-gradient(135deg,var(--pink-light),var(--pink))" : hasMedia || hasNote ? "rgba(var(--pink-rgb),.28)" : inOurTime ? "rgba(var(--pink-rgb),.1)" : "transparent", boxShadow: isBirthday ? "0 4px 18px rgba(245,158,11,.45)" : isSpecial ? "0 4px 18px rgba(var(--pink-deep-rgb),.5)" : isToday ? "0 2px 14px rgba(var(--pink-rgb),.35)" : hasMedia || hasNote ? "0 1px 8px rgba(var(--pink-rgb),.18)" : "none", outline: isToday ? "2.5px solid var(--pink-deep)" : "none", outlineOffset: 1 }}>
                    <span style={{ fontFamily: SANS, fontSize: "clamp(0.82rem,2.2vw,1rem)", color: isBirthday ? "#78350f" : isSpecial ? "#fff" : isToday ? "var(--pink-deep)" : "var(--cal-day-text)", fontWeight: isToday || isSpecial || isBirthday ? 700 : inOurTime ? 500 : 400, lineHeight: 1 }}>{day}</span>
                    {entry?.mood && <span style={{ fontSize: "clamp(0.45rem,1.2vw,0.58rem)", lineHeight: 1 }}>{entry.mood}</span>}
                    {isBirthday && !entry?.mood && <span style={{ fontSize: "0.5rem", lineHeight: 1 }}>🎂</span>}
                    {isSpecial && !isBirthday && !entry?.mood && <span style={{ fontSize: "0.48rem", lineHeight: 1 }}>⭐</span>}
                    {hasVideo  && !isSpecial && !isBirthday && !entry?.mood && <span style={{ fontSize: "0.45rem", lineHeight: 1 }}>🎬</span>}
                    {hasMedia  && !hasVideo && !isSpecial && !isBirthday && !entry?.mood && <span style={{ fontSize: "0.45rem", lineHeight: 1 }}>📸</span>}
                    {hasNote   && !hasMedia && !isSpecial && !isBirthday && !entry?.mood && <div style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--pink)" }} />}
                  </button>
                );
              })}
            </motion.div>
          </AnimatePresence>

          <div className="dk-cal-legend" style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center", padding: "1rem 1.5rem 1.5rem", borderTop: "1px solid rgba(var(--pink-rgb),.18)", fontFamily: SANS, fontSize: "0.82rem", color: "var(--cal-legend-col)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 12, height: 12, borderRadius: 3, background: "linear-gradient(135deg,#fde68a,#f59e0b)" }} /> birthday</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 12, height: 12, borderRadius: 3, background: "linear-gradient(135deg,var(--pink),var(--pink-deep))" }} /> special</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>📸 photo</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>🎬 video</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--pink)" }} /> note</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 12, height: 12, borderRadius: 3, outline: "2.5px solid var(--pink-deep)", outlineOffset: 1 }} /> today</span>
          </div>
        </motion.div>
      </div>

      {loading && (
        <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,245,249,.8)", backdropFilter: "blur(6px)" }}>
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} style={{ fontSize: "2rem" }}>💗</motion.div>
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <DayView key={selected} dateKey={selected}
            entry={entries[selected] ?? { date: selected, note: "", photos: [], special: false, specialLabel: "", mood: "", pinnedNote: "" }}
            birthdayLabel={BIRTHDAYS[selected.slice(5)] ?? null}
            originRect={originRect} onClose={() => setSelected(null)} onSave={handleSave} onDelete={handleDelete} />
        )}
      </AnimatePresence>
    </section>
  );
}