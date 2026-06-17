"use client";
import React, { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCalendarData, updateCalendarCache, deleteFromCalendarCache, type CalEntry, type Sticker } from "@/lib/calendarStore";
import { useUserData } from "@/lib/userStore";
import { useEscKey } from "@/lib/useEscKey";
import { SERIF, SANS, SCRIPT } from "@/lib/typography";
import { defaultStartDate } from "@/lib/relationship";
import { queuedFetch } from "@/lib/offlineQueue";
import { STICKER_PALETTE, makeSticker } from "@/lib/stickers";
import StickerOverlay from "@/components/StickerOverlay";
import Tip from "@/components/Tip";
import ReactionPills from "@/components/ReactionPills";
import { buzz } from "@/lib/haptics";

/* ─── types ─── */
interface DraftEntry extends Omit<CalEntry, "date"> {}

/* ─── constants ─── */
const MONTHS     = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_SHORT = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const DAYS_FULL  = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const SPECIAL_LABELS = ["🌹 First date","💗 Special moment","🌙 Late night talk","✈️ Adventure","🎂 Birthday","💌 Important","⭐ Favourite memory","🎶 Our song","🌸 Just us","🎮 Gaming night","🍜 Food date","🌃 Night out"];
const BIRTHDAYS: Record<string, string> = { "12-20": "🎂 Ankit's Birthday", "07-06": "🎂 Juhi's Birthday" };
const MOODS = ["🥰","😊","🥺","😂","🌙","💗","✨","🎮","🌷","😴","🤭","💫"];
const START = defaultStartDate();

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

const GRAIN  = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`;

function isAcceptedMedia(file: File) {
  return file.type.startsWith("image/") || ["video/mp4", "video/quicktime", "video/webm"].includes(file.type);
}

/* ─── Cloudinary signed upload (via /api/upload/sign) ─── */
import { uploadToCloudinary as _uploadToCloudinary } from "@/lib/cloudUpload";
import { cldThumb as _cldThumb } from "@/lib/cldImg";
async function uploadToCloudinary(file: File): Promise<string> {
  const resourceType = file.type.startsWith("video/") ? "video" : "image";
  return _uploadToCloudinary(file, { resourceType, folder: "journal" });
}
const cldThumb = (src: string, w = 200) => _cldThumb(src, w);

/* ─── media thumbnail (always renders a static <img>, never <video>) ─── */
function MediaThumb({ src, onClick }: { src: string; onClick: () => void }) {
  const isVid = isVideoSrc(src);
  return (
    <div style={{ position: "relative", cursor: "pointer", width: 64, height: 64 }} onClick={onClick}>
      <img src={cldThumb(src, 128)} loading="lazy" decoding="async" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, display: "block", border: "1px solid rgba(var(--pink-deep-rgb),.18)", background: "#1a0a12" }} alt="memory photo" />
      {isVid && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.3)", borderRadius: 8 }}>
          <span style={{ fontSize: "1.2rem" }}>▶</span>
        </div>
      )}
    </div>
  );
}

/* ─── lightbox (images + videos) — full quality, only one rendered at a time ─── */
function Lightbox({
  media, startIdx, onClose,
  stickersByPhoto, onStickersChange,
}: {
  media: string[]; startIdx: number; onClose: () => void;
  stickersByPhoto?: Record<string, Sticker[]>;
  onStickersChange?: (url: string, next: Sticker[]) => void;
}) {
  const [idx, setIdx] = useState(startIdx);
  const [editing, setEditing] = useState(false);
  const [picked, setPicked] = useState<string>(STICKER_PALETTE[0]);
  const photoWrapRef = useRef<HTMLDivElement>(null);
  const prev = useCallback((e: React.MouseEvent) => { e.stopPropagation(); setIdx(i => (i - 1 + media.length) % media.length); }, [media.length]);
  const next = useCallback((e: React.MouseEvent) => { e.stopPropagation(); setIdx(i => (i + 1) % media.length); }, [media.length]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      // While editing, let the arrow keys move between photos but block Esc
      // from closing the whole lightbox — Esc should exit edit mode first.
      if (e.key === "ArrowLeft") setIdx(i => (i - 1 + media.length) % media.length);
      if (e.key === "ArrowRight") setIdx(i => (i + 1) % media.length);
      if (e.key === "Escape") { if (editing) setEditing(false); else onClose(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [media.length, onClose, editing]);

  const url    = media[idx];
  const isVid  = isVideoSrc(url);
  const list   = stickersByPhoto?.[url] ?? [];
  const canEdit = !!onStickersChange && !isVid;

  // Tap on the photo while editing → drop selected sticker at that fraction
  const onPhotoTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editing || !canEdit) return;
    const rect = photoWrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top)  / rect.height;
    buzz("tap");
    onStickersChange!(url, [...list, makeSticker(picked, x, y)]);
  };

  const removeSticker = (id: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onStickersChange!(url, list.filter(s => s.id !== id));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 9500, background: "rgba(4,0,2,.97)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      {media.length > 1 && (
        <motion.button onClick={prev} aria-label="previous photo" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          style={{ position: "absolute", left: "clamp(0.6rem,2.5vw,2rem)", background: "rgba(var(--pink-deep-rgb),.15)", border: "1px solid rgba(var(--pink-deep-rgb),.3)", borderRadius: "50%", width: 48, height: 48, cursor: "pointer", color: "var(--pink)", fontSize: "1.4rem", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</motion.button>
      )}
      <AnimatePresence mode="wait">
        <motion.div key={idx} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          onClick={e => e.stopPropagation()}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", maxWidth: "min(85vw,900px)" }}>
          {isVid ? (
            <video src={url} controls autoPlay playsInline preload="metadata" style={{ maxWidth: "100%", maxHeight: "75vh", borderRadius: 6, boxShadow: "0 20px 60px rgba(0,0,0,.9)", display: "block", background: "#000" }} />
          ) : (
            // Wrap the image in a relative box so the sticker overlay can
            // position itself in fractional coordinates of the photo's actual
            // rendered size (which varies with viewport + object-fit).
            <div
              ref={photoWrapRef}
              onClick={onPhotoTap}
              style={{
                position: "relative",
                display: "inline-block",
                lineHeight: 0,
                cursor: editing ? "crosshair" : "default",
                borderRadius: 6,
                overflow: "hidden",
                boxShadow: "0 20px 60px rgba(0,0,0,.9)",
                outline: editing ? "2px dashed rgba(var(--pink-rgb), .9)" : "none",
                outlineOffset: editing ? 4 : 0,
              }}
            >
              <img src={url} alt={`photo ${idx + 1} of ${media.length}`} loading="eager" style={{ maxWidth: "100%", maxHeight: "75vh", objectFit: "contain", display: "block" }} />
              {/* read-only renderer for non-edit mode */}
              {!editing && <StickerOverlay stickers={list} />}
              {/* In edit mode: render each sticker as a tappable button so the
                  user can remove it without swallowing the photo-tap event. */}
              {editing && list.length > 0 && (
                <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                  {list.map(s => (
                    <button
                      key={s.id}
                      onClick={removeSticker(s.id)}
                      aria-label={`remove ${s.emoji}`}
                      style={{
                        position: "absolute",
                        left: `${s.x * 100}%`,
                        top: `${s.y * 100}%`,
                        transform: "translate(-50%, -50%)",
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        fontSize: `${s.size}rem`,
                        lineHeight: 1,
                        cursor: "pointer",
                        pointerEvents: "auto",
                        filter: "drop-shadow(0 2px 6px rgba(0,0,0,.55))",
                      }}
                    >{s.emoji}</button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {media.map((_, i) => (
              <div key={i} onClick={e => { e.stopPropagation(); setIdx(i); }} style={{ width: i === idx ? 10 : 6, height: i === idx ? 10 : 6, borderRadius: "50%", cursor: "pointer", background: i === idx ? "var(--pink-deep)" : "rgba(var(--pink-rgb),.35)", transition: "all 0.2s" }} />
            ))}
          </div>
          <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: "rgba(var(--pink-rgb),.5)", letterSpacing: "0.12em", margin: 0, textAlign: "center" }}>
            {editing
              ? "tap photo to drop · tap a sticker to remove · esc to finish"
              : <>{idx + 1} / {media.length} &nbsp;·&nbsp; ← → to navigate &nbsp;·&nbsp; ESC to close</>}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Sticker palette — appears only in edit mode */}
      {canEdit && editing && (
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
          onClick={e => e.stopPropagation()}
          style={{
            position: "absolute",
            bottom: "max(1rem, env(safe-area-inset-bottom))",
            left: "50%", transform: "translateX(-50%)",
            zIndex: 4,
            background: "rgba(20, 4, 14, .92)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(var(--pink-rgb), .25)",
            borderRadius: 18,
            padding: "0.55rem 0.75rem",
            display: "flex", gap: "0.35rem", flexWrap: "wrap", justifyContent: "center",
            maxWidth: "min(92vw, 540px)",
            boxShadow: "0 14px 40px rgba(0,0,0,.55)",
          }}>
          {STICKER_PALETTE.map(emoji => {
            const active = emoji === picked;
            return (
              <button
                key={emoji}
                onClick={() => setPicked(emoji)}
                aria-label={`pick ${emoji}`}
                aria-pressed={active}
                style={{
                  fontSize: "1.4rem",
                  width: 40, height: 40, borderRadius: 12,
                  background: active ? "rgba(var(--pink-deep-rgb), .35)" : "transparent",
                  border: active ? "1.5px solid rgba(var(--pink-rgb), .8)" : "1px solid transparent",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  lineHeight: 1,
                }}
              >{emoji}</button>
            );
          })}
        </motion.div>
      )}

      {media.length > 1 && (
        <motion.button onClick={next} aria-label="next photo" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          style={{ position: "absolute", right: "clamp(0.6rem,2.5vw,2rem)", background: "rgba(var(--pink-deep-rgb),.15)", border: "1px solid rgba(var(--pink-deep-rgb),.3)", borderRadius: "50%", width: 48, height: 48, cursor: "pointer", color: "var(--pink)", fontSize: "1.4rem", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>›</motion.button>
      )}

      {/* Toggle edit mode — only shown when there's an onStickersChange prop
          (i.e. the lightbox is opened from the day editor, not a read-only
          surface). Hidden on videos. */}
      {canEdit && (
        <motion.button
          onClick={(e) => { e.stopPropagation(); setEditing(v => !v); }}
          aria-label={editing ? "exit sticker edit mode" : "add stickers"}
          aria-pressed={editing}
          whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}
          style={{
            position: "absolute", top: "1rem", left: "1rem",
            background: editing ? "rgba(var(--pink-deep-rgb),.85)" : "rgba(255,255,255,.07)",
            border: `1px solid ${editing ? "rgba(var(--pink-rgb), .9)" : "rgba(255,255,255,.18)"}`,
            borderRadius: 50, padding: "0.45rem 1rem",
            cursor: "pointer", color: "#fff",
            fontFamily: SANS, fontSize: "0.78rem", fontWeight: 700,
            zIndex: 3, display: "flex", alignItems: "center", gap: "0.4rem",
          }}>
          🌸 {editing ? "done" : "stickers"}
        </motion.button>
      )}

      <motion.button onClick={onClose} aria-label="close photo viewer" whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
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
        <img src={cldThumb(src, 360)} loading={isTop ? "eager" : "lazy"} decoding="async" alt={`memory polaroid from ${dateKey}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
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
          <motion.button onClick={() => setTopIdx(i => (i - 1 + media.length) % media.length)} aria-label="previous polaroid" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            style={{ background: "rgba(var(--pink-deep-rgb),.1)", border: "1px solid rgba(var(--pink-deep-rgb),.25)", borderRadius: "50%", width: 38, height: 38, cursor: "pointer", color: "var(--pink)", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</motion.button>
          <div style={{ display: "flex", gap: "0.45rem", alignItems: "center" }}>
            {media.map((_, i) => (
              <div key={i} onClick={() => setTopIdx(i)} style={{ width: i === topIdx ? 9 : 5, height: i === topIdx ? 9 : 5, borderRadius: "50%", cursor: "pointer", background: i === topIdx ? "var(--pink-deep)" : "rgba(var(--pink-rgb),.3)", transition: "all 0.2s" }} />
            ))}
          </div>
          <motion.button onClick={() => setTopIdx(i => (i + 1) % media.length)} aria-label="next polaroid" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
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
              <img src={cldThumb(src, 280)} loading="lazy" decoding="async" alt={`memory frame ${i + 1} from ${dateKey}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: "saturate(0.9)" }} />
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
  const userData = useUserData();
  const [draft, setDraft] = useState<DraftEntry>({
    note: entry.note || "", photos: entry.photos || [],
    photoStickers: entry.photoStickers || {},
    reactions: entry.reactions || {},
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

  const removeMedia = (i: number) => setDraft(d => {
    const droppedUrl = (d.photos || [])[i];
    const photos = (d.photos || []).filter((_, idx) => idx !== i);
    // Drop the dropped photo's stickers — they refer to a URL nobody renders
    const photoStickers = { ...(d.photoStickers || {}) };
    if (droppedUrl) delete photoStickers[droppedUrl];
    return { ...d, photos, photoStickers };
  });

  const setStickersFor = useCallback((url: string, next: Sticker[]) => {
    setDraft(d => ({ ...d, photoStickers: { ...(d.photoStickers || {}), [url]: next } }));
  }, []);

  // Track autosave state for an inline indicator
  const [autoState, setAutoState] = useState<"idle" | "dirty" | "saving" | "saved" | "error">("idle");
  const [savedAt,   setSavedAt]   = useState<Date | null>(null);
  const lastSerialised = useRef<string>("");
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Init the baseline on mount so opening an entry doesn't flag it dirty
  useEffect(() => {
    lastSerialised.current = JSON.stringify(draft);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced autosave — 1.4s of inactivity
  useEffect(() => {
    const current = JSON.stringify(draft);
    if (current === lastSerialised.current) return;
    setAutoState("dirty");
    if (autoTimer.current) clearTimeout(autoTimer.current);
    autoTimer.current = setTimeout(async () => {
      setAutoState("saving");
      try {
        await onSave(draft);
        lastSerialised.current = JSON.stringify(draft);
        setSavedAt(new Date());
        setAutoState("saved");
        setTimeout(() => setAutoState(s => s === "saved" ? "idle" : s), 2500);
      } catch {
        setAutoState("error");
      }
    }, 1400);
    return () => { if (autoTimer.current) clearTimeout(autoTimer.current); };
  }, [draft, onSave]);

  const save = async () => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    setSaving(true); setAutoState("saving");
    try {
      await onSave(draft);
      lastSerialised.current = JSON.stringify(draft);
      setSavedAt(new Date());
      setAutoState("saved");
      setTimeout(() => setAutoState(s => s === "saved" ? "idle" : s), 2500);
    } catch { setAutoState("error"); }
    finally { setSaving(false); }
  };

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
        animate={{ opacity: 1, scale: 1, borderRadius: 22, x: 0, y: 0 }}
        exit={{ opacity: 0, scale: 0.06, borderRadius: 999 }}
        transition={{ type: "spring", stiffness: 230, damping: 30, mass: 0.8 }}
        style={{
          position: "fixed", top: "2vh", left: "2vw", right: "2vw", bottom: "2vh", zIndex: 3001,
          background: `
            radial-gradient(ellipse 80% 50% at 50% 0%, rgba(var(--pink-rgb),.22), transparent 65%),
            radial-gradient(ellipse 60% 45% at 50% 100%, rgba(var(--pink-deep-rgb),.18), transparent 70%),
            linear-gradient(160deg,
              color-mix(in srgb, var(--pink-deep), #000 62%) 0%,
              color-mix(in srgb, var(--pink-deep), #000 78%) 50%,
              color-mix(in srgb, var(--pink-deep), #000 70%) 100%)
          `,
          display: "flex", flexDirection: "column", overflow: "hidden",
          border: "1.5px solid rgba(var(--pink-rgb),.35)",
          boxShadow: `
            0 30px 100px rgba(0,0,0,.85),
            0 0 80px rgba(var(--pink-deep-rgb),.35),
            inset 0 1px 0 rgba(255,255,255,.06)
          `,
        }}
      >
        {/* Themed shimmer along top edge */}
        <div style={{
          position:"absolute", top:0, left:0, right:0, height:2,
          background: "linear-gradient(90deg, transparent, var(--pink), var(--pink-deep), var(--pink), transparent)",
          opacity: 0.65, pointerEvents:"none",
        }}/>

        {/* ── Header ── */}
        <div style={{ padding: "clamp(1rem,3vw,1.8rem) clamp(1rem,3vw,2rem) clamp(0.8rem,2vw,1.2rem)", borderBottom: "1px solid rgba(var(--pink-rgb),.18)", background: "linear-gradient(180deg,rgba(var(--pink-rgb),.08) 0%,transparent)", flexShrink: 0, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.8rem", position: "relative" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            {birthdayLabel && (
              <motion.span
                animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 2 }}
                style={{ fontFamily: SANS, fontSize: "0.82rem", fontWeight: 700, color: "#fbbf24", display: "block", marginBottom: "0.25rem", letterSpacing: "0.04em" }}>
                {birthdayLabel}! 🎉
              </motion.span>
            )}
            {dn && (
              <span style={{ fontFamily: SANS, fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--pink)", display: "block", marginBottom: "0.3rem", fontWeight: 700, opacity: 0.85 }}>
                day {dn} of us 🌸
              </span>
            )}
            <h2 style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "clamp(1.15rem,3.5vw,1.9rem)", color: "#fff", margin: 0, lineHeight: 1.25, fontWeight: 500, textShadow: "0 2px 16px rgba(var(--pink-deep-rgb),.5)" }}>
              {DAYS_FULL[displayDate.getDay()]}, {MONTHS[displayDate.getMonth()]} {displayDate.getDate()}, {displayDate.getFullYear()}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "0.4rem", flexWrap: "wrap" }}>
              {entry.specialLabel && (
                <span style={{ fontFamily: SANS, fontSize: "0.75rem", color: "#fff", background: "linear-gradient(135deg,var(--pink),var(--pink-deep))", padding: "0.18rem 0.65rem", borderRadius: 20, fontWeight: 600, boxShadow: "0 2px 10px rgba(var(--pink-deep-rgb),.4)" }}>
                  ✨ {entry.specialLabel}
                </span>
              )}
              {draft.mood && <span style={{ fontSize: "1.3rem", lineHeight: 1 }}>{draft.mood}</span>}
              {entry.weather && (
                <span
                  title={`${entry.weather.label}, ${entry.weather.tempMinC}°–${entry.weather.tempMaxC}°C`}
                  style={{ fontFamily: SANS, fontSize: "0.72rem", color: "rgba(255,255,255,.85)", background: "rgba(255,255,255,.1)", border: "1px solid rgba(var(--pink-rgb),.3)", padding: "0.18rem 0.6rem", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: "0.3rem", backdropFilter: "blur(8px)" }}>
                  <span style={{ fontSize: "0.95rem", lineHeight: 1 }}>{entry.weather.emoji}</span>
                  {entry.weather.tempMaxC}°
                </span>
              )}
              <span style={{ fontFamily: "monospace", fontSize: "0.68rem", color: "rgba(255,255,255,.45)", letterSpacing: "0.1em" }}>{fmtDate(dateKey)}</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
            {hasContent && (
              <div style={{ background: "rgba(255,255,255,.08)", borderRadius: 28, padding: "0.18rem", display: "flex", border: "1px solid rgba(var(--pink-rgb),.3)", backdropFilter: "blur(8px)" }}>
                {(["view", "edit"] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    style={{ padding: "0.28rem 0.85rem", borderRadius: 24, border: "none", fontFamily: SANS, fontSize: "0.82rem", fontWeight: tab === t ? 700 : 500, cursor: "pointer", transition: "all 0.2s", background: tab === t ? "linear-gradient(135deg,var(--pink),var(--pink-deep))" : "transparent", color: tab === t ? "#fff" : "rgba(255,255,255,.7)", boxShadow: tab === t ? "0 2px 10px rgba(var(--pink-deep-rgb),.4)" : "none" }}>
                    {t === "view" ? "💌 memory" : "✏️ edit"}
                  </button>
                ))}
              </div>
            )}
            <Tip label="close" placement="left" style={{ flexShrink: 0 }}>
              <motion.button onClick={onClose} aria-label="close memory editor" whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
                style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(var(--pink-rgb),.4)", borderRadius: "50%", width: 34, height: 34, cursor: "pointer", color: "#fff", fontSize: "0.95rem", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</motion.button>
            </Tip>
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
                      <span style={{ fontFamily: SANS, fontSize: "0.75rem", color: "rgba(255,255,255,.7)", letterSpacing: "0.12em", textTransform: "uppercase" }}>{draft.photos!.length} item{draft.photos!.length !== 1 ? "s" : ""}</span>
                      <div style={{ display: "flex", gap: "0.35rem" }}>
                        {(["polaroid", "film"] as const).map(m => (
                          <button key={m} onClick={() => setDispMode(m)}
                            style={{ padding: "0.25rem 0.75rem", borderRadius: 18, cursor: "pointer", transition: "all 0.2s", fontFamily: SANS, fontSize: "0.78rem", border: `1px solid ${dispMode === m ? "rgba(var(--pink-rgb),.5)" : "rgba(var(--pink-rgb),.22)"}`, background: dispMode === m ? "rgba(var(--pink-rgb),.22)" : "transparent", color: dispMode === m ? "#fff" : "rgba(255,255,255,.55)" }}>
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
                  <div style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(var(--pink-rgb),.22)", borderRadius: 14, padding: "clamp(1.2rem,3vw,1.8rem) clamp(1.2rem,3vw,1.8rem) clamp(1.2rem,3vw,1.8rem) clamp(2rem,4vw,2.5rem)", position: "relative", overflow: "hidden", marginTop: hasMedia ? "2rem" : "0" }}>
                    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "repeating-linear-gradient(transparent,transparent 31px,rgba(var(--pink-rgb),.1) 31px,rgba(var(--pink-rgb),.1) 32px)" }} />
                    <div style={{ position: "absolute", left: "2.5rem", top: 0, bottom: 0, width: 1, background: "rgba(var(--pink-rgb),.18)" }} />
                    <p style={{ fontFamily: SERIF, fontSize: "clamp(1rem,2.2vw,1.18rem)", color: "rgba(255,255,255,.92)", lineHeight: 2, margin: 0, whiteSpace: "pre-wrap", position: "relative", zIndex: 1, letterSpacing: "0.01em", fontWeight: 400 }}>{draft.note}</p>
                    <div style={{ marginTop: "1.4rem", display: "flex", alignItems: "center", gap: "0.5rem", position: "relative", zIndex: 1 }}>
                      <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,rgba(var(--pink-rgb),.4),transparent)" }} />
                      <span style={{ fontFamily: SCRIPT, fontSize: "0.85rem", color: "var(--pink)" }}>— with love 🩷</span>
                    </div>
                  </div>
                ) : !hasMedia && (
                  <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "0.8rem", opacity: 0.65 }}>🌸</div>
                    <p style={{ fontFamily: SANS, fontSize: "0.95rem", color: "rgba(255,255,255,.6)", margin: 0 }}>nothing here yet — tap edit to add a memory</p>
                  </div>
                )}

                {/* Reactions — let the partner mark a memory without having
                    to write back. Toggle hits the dedicated endpoint which
                    also fires a push, then SSE updates everyone's cache. */}
                {hasContent && (
                  <div style={{ marginTop: "1.4rem", display: "flex", justifyContent: "center" }}>
                    <ReactionPills
                      reactions={draft.reactions}
                      onToggle={async (emoji) => {
                        const myId = userData?.userId || "";
                        // Optimistic local toggle so the pill responds instantly
                        setDraft(d => {
                          const next: Record<string, string[]> = { ...(d.reactions || {}) };
                          const list = next[emoji] ?? [];
                          if (myId && list.includes(myId)) {
                            const filtered = list.filter(id => id !== myId);
                            if (filtered.length === 0) delete next[emoji];
                            else next[emoji] = filtered;
                          } else if (myId) {
                            next[emoji] = [...list, myId];
                          }
                          return { ...d, reactions: next };
                        });
                        await fetch("/api/calendar/reaction", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ date: dateKey, emoji }),
                        });
                      }}
                      align="center"
                    />
                  </div>
                )}
              </motion.div>
            )}

            {/* EDIT */}
            {(tab === "edit" || !hasContent) && (
              <motion.div key="edit" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22, ease: "easeOut" }} style={{ padding: "clamp(1.2rem,3vw,2rem)", display: "flex", flexDirection: "column", gap: "1.4rem" }}>

                {/* Mood */}
                <div>
                  <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: "rgba(255,255,255,.7)", marginBottom: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase" }}>How are you feeling?</p>
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
                          <Tip label="remove" placement="top" style={{ position: "absolute", top: -6, right: -6, zIndex: 4 }}>
                            <button onClick={() => removeMedia(i)} aria-label={`remove photo ${i + 1}`}
                              style={{ width: 20, height: 20, borderRadius: "50%", border: "none", background: "var(--pink-deep)", color: "#fff", fontSize: "0.6rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,.3)" }}>✕</button>
                          </Tip>
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

                {/* Autosave indicator */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.45rem", padding: "0 0 0.4rem", minHeight: 18, fontFamily: SANS, fontSize: "0.72rem" }}>
                  {autoState === "saving" && (
                    <>
                      <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ display: "inline-block", color: "var(--muted)" }}>✦</motion.span>
                      <span style={{ color: "var(--muted)" }}>saving…</span>
                    </>
                  )}
                  {autoState === "saved" && (
                    <>
                      <span style={{ color: "#16a34a" }}>✓</span>
                      <span style={{ color: "var(--muted)" }}>saved {savedAt ? "just now" : ""}</span>
                    </>
                  )}
                  {autoState === "dirty" && (
                    <>
                      <span style={{ color: "var(--muted)" }}>•</span>
                      <span style={{ color: "var(--muted)" }}>unsaved changes</span>
                    </>
                  )}
                  {autoState === "error" && (
                    <>
                      <span style={{ color: "#ef4444" }}>⚠</span>
                      <span style={{ color: "#ef4444" }}>save failed — retry?</span>
                    </>
                  )}
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
        {lbIdx !== null && <Lightbox
          media={draft.photos!}
          startIdx={lbIdx}
          onClose={() => setLbIdx(null)}
          stickersByPhoto={draft.photoStickers}
          onStickersChange={setStickersFor}
        />}
      </AnimatePresence>
    </>
  );
}

/* ─── one-time swipe hint ─── */
function SwipeHint() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem("ann_swipe_hint_v1")) return;
    } catch {}
    const t = setTimeout(() => setShow(true), 800);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  const dismiss = () => {
    try { localStorage.setItem("ann_swipe_hint_v1", "seen"); } catch {}
    setShow(false);
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      onClick={dismiss}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: "0.55rem",
        background: "rgba(var(--pink-rgb),.14)",
        border: "1px dashed rgba(var(--pink-rgb),.5)",
        borderRadius: 50, padding: "0.45rem 1rem",
        margin: "0 auto 0.9rem", maxWidth: 320,
        fontFamily: "var(--font-lato),'Inter',system-ui,sans-serif",
        fontSize: "0.74rem", color: "var(--text)",
        cursor: "pointer",
      }}
      onAnimationComplete={() => setTimeout(() => { try { localStorage.setItem("ann_swipe_hint_v1", "seen"); } catch {} }, 6000)}
    >
      <motion.span animate={{ x: [-4, 4, -4] }} transition={{ repeat: Infinity, duration: 1.6 }}>👈</motion.span>
      <span>swipe to change months</span>
      <motion.span animate={{ x: [4, -4, 4] }} transition={{ repeat: Infinity, duration: 1.6 }}>👉</motion.span>
      <span style={{ color: "var(--muted)", fontSize: "0.7rem", marginLeft: "0.3rem" }}>✕</span>
    </motion.div>
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

  // React to in-app navigations that change ?date= without unmounting the
  // calendar (e.g. Cmd+K picking a different entry while already on /journal).
  useEffect(() => {
    if (!initialDate) return;
    const d = new Date(initialDate + "T12:00:00");
    if (isNaN(d.getTime())) return;
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setSelected(initialDate);
    setOriginRect(null);
  }, [initialDate]);

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
    const payload: CalEntry = { date: selected, note: draft.note || "", photos: draft.photos || [], photoStickers: draft.photoStickers || {}, reactions: draft.reactions || {}, special: draft.special || false, specialLabel: draft.specialLabel || "", mood: draft.mood || "", pinnedNote: draft.pinnedNote || "" };
    // queuedFetch persists offline — local cache updates either way so the
    // entry shows immediately; replay happens when the browser comes back
    await queuedFetch({ url: "/api/calendar", method: "POST", body: payload, id: `cal:save:${selected}` });
    updateCalendarCache(payload);
    setSelected(null);
  }, [selected]);

  const handleDelete = useCallback(async () => {
    if (!selected) return;
    await queuedFetch({ url: "/api/calendar", method: "DELETE", body: { date: selected }, id: `cal:del:${selected}` });
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
    <section id="calendar" style={{ position: "relative", width: "100%", minHeight: "100vh", padding: "clamp(4rem,7vw,6rem) clamp(1rem,3vw,2rem) clamp(4rem,7vw,6rem)", background: "linear-gradient(180deg,var(--rose) 0%,var(--pink-light) 30%,rgba(var(--pink-rgb),.55) 60%,rgba(var(--pink-rgb),.85) 85%,var(--pink-deep) 100%)", overflow: "hidden" }}>
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
        <SwipeHint />
        <motion.div animate={{ rotateY: flipDir === "right" ? -12 : flipDir === "left" ? 12 : 0, scale: flipDir ? 0.97 : 1, opacity: flipDir ? 0.6 : 1 }} transition={{ duration: 0.24, ease: "easeInOut" }}
          className="dk-cal-card"
          style={{ background: "var(--cal-card-bg)", borderRadius: 28, overflow: "hidden", transformStyle: "preserve-3d", perspective: 1000, boxShadow: "var(--cal-card-shadow)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.2rem 1.6rem", background: "linear-gradient(135deg,rgba(var(--pink-deep-rgb),0.9),rgba(var(--pink-rgb),0.55))", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, backgroundImage: GRAIN, pointerEvents: "none", opacity: 0.5 }} />
            <motion.button onClick={() => changeMonth("left")} aria-label="previous month" whileHover={{ scale: 1.18, x: -2 }} whileTap={{ scale: 0.9 }} style={{ background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.22)", cursor: "pointer", width: 38, height: 38, borderRadius: "50%", color: "#fff", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}>‹</motion.button>
            <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
              <AnimatePresence mode="wait">
                <motion.p key={`${year}-${month}`} initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.22 }} style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "clamp(1.2rem,3vw,1.6rem)", color: "#fff", margin: 0, fontWeight: 400 }}>{MONTHS[month]}</motion.p>
              </AnimatePresence>
              <p style={{ fontFamily: SANS, fontSize: "0.85rem", color: "rgba(255,255,255,.6)", margin: 0 }}>{year}</p>
              {!isOnToday && (
                <motion.button onClick={goToToday} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }}
                  style={{ marginTop: "0.3rem", padding: "0.18rem 0.7rem", borderRadius: 20, border: "1px solid rgba(255,255,255,.3)", background: "rgba(255,255,255,.15)", color: "rgba(255,255,255,.85)", fontFamily: SANS, fontSize: "0.62rem", cursor: "pointer", letterSpacing: "0.06em" }}>
                  today
                </motion.button>
              )}
            </div>
            <motion.button onClick={() => changeMonth("right")} aria-label="next month" whileHover={{ scale: 1.18, x: 2 }} whileTap={{ scale: 0.9 }} style={{ background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.22)", cursor: "pointer", width: 38, height: 38, borderRadius: "50%", color: "#fff", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}>›</motion.button>
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