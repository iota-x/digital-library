"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEscKey } from "@/lib/useEscKey";
import { onPartnerSSE } from "@/lib/sseClient";
import { usePartnerPresence } from "@/lib/presenceStore";
import { SANS, SCRIPT } from "@/lib/typography";
import { buzz } from "@/lib/haptics";
import { useToast } from "@/components/Toaster";
import { uploadToCloudinary } from "@/lib/cloudUpload";
import DoodleGallery from "@/components/DoodleGallery";
import Tip from "@/components/Tip";

/**
 * A shared whiteboard the two of you draw on together.
 *
 * Strokes are normalised (0–1 of the canvas box) so they map across phone
 * and laptop. A completed stroke is POSTed on pointer-up; partner strokes
 * arrive over SSE and are drawn live. The canvas reloads the saved picture
 * on open so it's never blank if there's history.
 */

interface Point { x: number; y: number }
interface Stroke { id: string; color: string; size: number; points: Point[]; userId: string; at: number }

const COLORS = ["#be185d", "#7c3aed", "#0284c7", "#059669", "#d97706", "#1f2937", "#ffffff"];
const SIZES = [3, 6, 12];

export default function DoodleCanvas({ open, onClose }: { open: boolean; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const currentRef = useRef<{ color: string; size: number; points: Point[] } | null>(null);
  const drawingRef = useRef(false);

  const [color, setColor] = useState("#be185d");
  const [size, setSize] = useState(6);
  const [loading, setLoading] = useState(true);
  const [nudging, setNudging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const partner = usePartnerPresence();
  const toaster = useToast();

  useEscKey(onClose, open);

  // Keep the latest brush in refs so the pointer handlers (bound once) read
  // fresh values without rebinding.
  const colorRef = useRef(color);
  const sizeRef = useRef(size);
  colorRef.current = color;
  sizeRef.current = size;

  /** Map a normalised point to CSS pixels of the current canvas box. */
  const toPx = (canvas: HTMLCanvasElement, p: Point) => ({
    x: p.x * canvas.clientWidth,
    y: p.y * canvas.clientHeight,
  });

  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, s: { color: string; size: number; points: Point[] }) => {
    if (s.points.length === 0) return;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    const first = toPx(canvas, s.points[0]);
    if (s.points.length === 1) {
      // A dot — draw a filled circle so a tap leaves a mark.
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(first.x, first.y, s.size / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < s.points.length; i++) {
      const p = toPx(canvas, s.points[i]);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    for (const s of strokesRef.current) drawStroke(ctx, canvas, s);
    if (currentRef.current) drawStroke(ctx, canvas, currentRef.current);
  }, [drawStroke]);

  /** Size the backing store to the box × DPR for crisp lines. */
  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  }, [redraw]);

  // Load saved strokes + subscribe to partner strokes whenever opened.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);

    // Defer until the modal box has laid out so clientWidth is correct.
    const raf = requestAnimationFrame(() => {
      resize();
    });

    fetch("/api/doodle", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { strokes?: Stroke[] }) => {
        if (cancelled) return;
        strokesRef.current = Array.isArray(d.strokes) ? d.strokes : [];
        redraw();
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    const unsub = onPartnerSSE((detail) => {
      if (detail.type === "doodle:stroke" && detail.stroke) {
        strokesRef.current = [...strokesRef.current, detail.stroke as Stroke];
        redraw();
        buzz("tap");
      } else if (detail.type === "doodle:clear") {
        strokesRef.current = [];
        currentRef.current = null;
        redraw();
      }
    });

    const onWinResize = () => resize();
    window.addEventListener("resize", onWinResize);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      unsub();
      window.removeEventListener("resize", onWinResize);
    };
  }, [open, redraw, resize]);

  // ── Pointer drawing ──
  const pointFromEvent = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drawingRef.current = true;
    currentRef.current = { color: colorRef.current, size: sizeRef.current, points: [pointFromEvent(e)] };
    redraw();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !currentRef.current) return;
    e.preventDefault();
    currentRef.current.points.push(pointFromEvent(e));
    redraw();
  };

  const commitStroke = useCallback(() => {
    const cur = currentRef.current;
    drawingRef.current = false;
    currentRef.current = null;
    if (!cur || cur.points.length === 0) return;
    const local: Stroke = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      color: cur.color, size: cur.size, points: cur.points, userId: "me", at: Date.now(),
    };
    strokesRef.current = [...strokesRef.current, local];
    redraw();
    fetch("/api/doodle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stroke: { color: cur.color, size: cur.size, points: cur.points } }),
    }).catch(() => {});
  }, [redraw]);

  /** Poke the partner to come look at the doodle (SSE + push). */
  const sendNudge = async () => {
    if (nudging) return;
    setNudging(true);
    buzz("double");
    try {
      const r = await fetch("/api/doodle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nudge: true }),
      });
      toaster.toast(
        r.ok
          ? { variant: "success", title: "sent 🎨", message: partner.name ? `${partner.name} got a nudge to come look` : "your partner got a nudge to come look", durationMs: 4000 }
          : { variant: "error", message: "couldn't send the nudge — try again", durationMs: 4000 },
      );
    } catch {
      toaster.toast({ variant: "error", message: "couldn't send the nudge — try again", durationMs: 4000 });
    } finally {
      // brief cooldown so it can't be spammed
      setTimeout(() => setNudging(false), 4000);
    }
  };

  /** Flatten the current canvas onto a white background and export a PNG blob.
   *  (The canvas itself is transparent — the white board is a CSS background.) */
  const snapshotBlob = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) return resolve(null);
      const out = document.createElement("canvas");
      out.width = canvas.width;
      out.height = canvas.height;
      const ctx = out.getContext("2d");
      if (!ctx) return resolve(null);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.drawImage(canvas, 0, 0);
      out.toBlob((b) => resolve(b), "image/png");
    });
  }, []);

  /** Upload a snapshot and add it to the gallery. */
  const saveToGallery = useCallback(async (silent = false): Promise<boolean> => {
    if (strokesRef.current.length === 0) {
      if (!silent) toaster.toast({ variant: "info", message: "draw something first 🎨", durationMs: 3000 });
      return false;
    }
    if (!silent) setSaving(true);
    try {
      const blob = await snapshotBlob();
      if (!blob) throw new Error("snapshot failed");
      const file = new File([blob], "doodle.png", { type: "image/png" });
      const url = await uploadToCloudinary(file, { folder: "doodles" });
      const res = await fetch("/api/doodle/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url }),
      });
      if (!res.ok) throw new Error("save failed");
      if (!silent) toaster.toast({ variant: "success", title: "saved 🖼", message: "added to your doodle gallery", durationMs: 3500 });
      return true;
    } catch {
      if (!silent) toaster.toast({ variant: "error", message: "couldn't save to gallery — try again", durationMs: 3500 });
      return false;
    } finally {
      if (!silent) setSaving(false);
    }
  }, [snapshotBlob, toaster]);

  const clearBoard = async () => {
    // Auto-save the finished canvas to the gallery before wiping it, so a
    // completed drawing is never lost to a clear. Best-effort + silent.
    if (strokesRef.current.length > 0) { await saveToGallery(true); }
    strokesRef.current = [];
    currentRef.current = null;
    redraw();
    buzz("med");
    await fetch("/api/doodle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clear: true }),
    }).catch(() => {});
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: "fixed", inset: 0, zIndex: 9996,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "clamp(0.8rem, 3vw, 2rem)",
            background: "rgba(var(--pink-deep-rgb), .28)",
            backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
          }}
        >
          <motion.div
            initial={{ scale: 0.92, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 150, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(680px, 100%)", maxHeight: "92vh",
              display: "flex", flexDirection: "column",
              background: "var(--cream)", borderRadius: 24,
              border: "1.5px solid rgba(var(--pink-rgb), .4)",
              boxShadow: "0 32px 80px rgba(var(--pink-deep-rgb), .3)",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.9rem 1.1rem 0.6rem" }}>
              <div>
                <p style={{ fontFamily: SCRIPT, fontSize: "1.25rem", color: "var(--pink-deep)", margin: 0, lineHeight: 1 }}>
                  draw together
                </p>
                <p style={{ fontFamily: SANS, fontSize: "0.68rem", color: "var(--muted)", margin: "0.2rem 0 0" }}>
                  {partner.online ? `${partner.name} is here — draw at the same time 💞` : "leave them a doodle to find 🩷"}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <button onClick={() => setGalleryOpen(true)} aria-label="open doodle gallery" style={{
                  fontFamily: SANS, fontSize: "0.75rem", fontWeight: 700, color: "var(--pink-deep)",
                  background: "rgba(var(--pink-deep-rgb), .08)", border: "1px solid rgba(var(--pink-deep-rgb), .22)",
                  borderRadius: 50, padding: "0.35rem 0.8rem", cursor: "pointer",
                }}>🖼 gallery</button>
                <Tip label="close" placement="left">
                  <button onClick={onClose} aria-label="close doodle" style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: "1.1rem", color: "var(--muted)", padding: "0.2rem 0.4rem",
                  }}>✕</button>
                </Tip>
              </div>
            </div>

            {/* Canvas */}
            <div style={{ position: "relative", margin: "0 0.9rem", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(var(--pink-rgb), .3)", background: "#fff" }}>
              <canvas
                ref={canvasRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={commitStroke}
                onPointerCancel={commitStroke}
                onPointerLeave={commitStroke}
                style={{
                  display: "block", width: "100%", height: "min(58vh, 440px)",
                  touchAction: "none", cursor: "crosshair",
                }}
              />
              {loading && (
                <div style={{
                  position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: SCRIPT, fontSize: "1.1rem", color: "rgba(var(--pink-deep-rgb), .4)", pointerEvents: "none",
                }}>
                  loading the canvas… 🎨
                </div>
              )}
            </div>

            {/* Toolbar */}
            <div style={{
              display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap",
              padding: "0.7rem 0.9rem 1rem",
            }}>
              <div style={{ display: "flex", gap: "0.3rem" }}>
                {COLORS.map((c) => (
                  <button key={c} aria-label={`color ${c}`} onClick={() => setColor(c)} style={{
                    width: 24, height: 24, borderRadius: "50%", background: c, cursor: "pointer",
                    border: color === c ? "2.5px solid var(--pink-deep)" : "1.5px solid rgba(0,0,0,.15)",
                    boxShadow: color === c ? "0 0 0 2px rgba(var(--pink-rgb), .3)" : "none",
                  }} />
                ))}
              </div>
              <div style={{ display: "flex", gap: "0.3rem", alignItems: "center", marginLeft: "0.2rem" }}>
                {SIZES.map((s) => (
                  <button key={s} aria-label={`brush ${s}`} onClick={() => setSize(s)} style={{
                    width: 30, height: 30, borderRadius: 8, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: size === s ? "rgba(var(--pink-deep-rgb), .12)" : "transparent",
                    border: size === s ? "1.5px solid var(--pink-deep)" : "1px solid rgba(var(--pink-rgb), .3)",
                  }}>
                    <span style={{ width: s + 2, height: s + 2, borderRadius: "50%", background: "var(--pink-deep)", display: "block" }} />
                  </button>
                ))}
              </div>
              <motion.button
                onClick={sendNudge}
                disabled={nudging}
                whileTap={{ scale: 0.95 }}
                style={{
                  marginLeft: "auto", fontFamily: SANS, fontSize: "0.75rem", fontWeight: 700,
                  color: "#fff", background: "linear-gradient(135deg, var(--pink), var(--pink-deep))",
                  border: "none", borderRadius: 50, padding: "0.4rem 1rem",
                  cursor: nudging ? "default" : "pointer", opacity: nudging ? 0.6 : 1,
                  boxShadow: "0 2px 10px rgba(var(--pink-deep-rgb), .35)",
                }}>
                {nudging ? "sent ✓" : "📨 send"}
              </motion.button>
              <button onClick={() => saveToGallery(false)} disabled={saving} style={{
                fontFamily: SANS, fontSize: "0.75rem", fontWeight: 700,
                color: "var(--pink-deep)", background: "rgba(var(--pink-rgb), .12)",
                border: "1px solid rgba(var(--pink-deep-rgb), .22)", borderRadius: 50,
                padding: "0.4rem 0.9rem", cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1,
              }}>{saving ? "saving…" : "🖼 save"}</button>
              <button onClick={clearBoard} style={{
                fontFamily: SANS, fontSize: "0.75rem", fontWeight: 700,
                color: "var(--pink-deep)", background: "rgba(var(--pink-deep-rgb), .08)",
                border: "1px solid rgba(var(--pink-deep-rgb), .22)", borderRadius: 50,
                padding: "0.4rem 0.9rem", cursor: "pointer",
              }}>clear</button>
            </div>
          </motion.div>

          <DoodleGallery open={galleryOpen} onClose={() => setGalleryOpen(false)} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
