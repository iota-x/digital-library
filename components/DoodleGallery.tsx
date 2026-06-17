"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { useEscKey } from "@/lib/useEscKey";
import { cldThumb } from "@/lib/cldImg";
import { SANS, SCRIPT } from "@/lib/typography";
import BlurImage from "@/components/BlurImage";
import Tip from "@/components/Tip";

interface GalleryItem { id: string; imageUrl: string; name: string; createdAt: string }

function fmt(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/**
 * The saved-doodle gallery — a grid of every canvas the couple chose to keep.
 * Opened from the doodle board; supports a full-size lightbox and delete.
 */
export default function DoodleGallery({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEscKey(() => (lightbox ? setLightbox(null) : onClose()), open);
  useFocusTrap(dialogRef, { active: open && !lightbox, onEscape: onClose });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetch("/api/doodle/gallery", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: GalleryItem[]) => { if (!cancelled) setItems(Array.isArray(d) ? d : []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open]);

  const remove = async (id: string) => {
    setItems((xs) => xs.filter((x) => x.id !== id));
    await fetch("/api/doodle/gallery", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          style={{
            position: "fixed", inset: 0, zIndex: 9997,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "clamp(0.8rem, 3vw, 2rem)",
            background: "rgba(var(--pink-deep-rgb), .3)",
            backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
          }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog" aria-modal="true" aria-label="Doodle gallery"
            initial={{ scale: 0.92, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 150, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(720px, 100%)", maxHeight: "90vh", overflowY: "auto",
              background: "var(--cream)", borderRadius: 24,
              border: "1.5px solid rgba(var(--pink-rgb), .4)",
              boxShadow: "0 32px 80px rgba(var(--pink-deep-rgb), .3)",
              padding: "1.2rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div>
                <p style={{ fontFamily: SCRIPT, fontSize: "1.3rem", color: "var(--pink-deep)", margin: 0, lineHeight: 1 }}>doodle gallery</p>
                <p style={{ fontFamily: SANS, fontSize: "0.7rem", color: "var(--muted)", margin: "0.2rem 0 0" }}>everything you&apos;ve drawn together 🎨</p>
              </div>
              <Tip label="close" placement="left">
                <button onClick={onClose} aria-label="close gallery" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", color: "var(--muted)" }}>✕</button>
              </Tip>
            </div>

            {loading ? (
              <p style={{ fontFamily: SCRIPT, fontSize: "1.05rem", color: "rgba(var(--pink-deep-rgb),.5)", textAlign: "center", padding: "2rem 0" }}>opening the gallery…</p>
            ) : items.length === 0 ? (
              <p style={{ fontFamily: SANS, fontSize: "0.85rem", color: "var(--muted)", textAlign: "center", padding: "2rem 1rem", lineHeight: 1.6 }}>
                nothing saved yet — draw something on the board and tap <strong>save to gallery</strong> to keep it here forever 🩷
              </p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.8rem" }}>
                {items.map((it) => (
                  <div key={it.id} style={{ position: "relative" }}>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      onClick={() => setLightbox(it.imageUrl)}
                      style={{
                        width: "100%", aspectRatio: "1", borderRadius: 14, overflow: "hidden", cursor: "pointer",
                        border: "1px solid rgba(var(--pink-rgb),.3)", background: "#fff", padding: 0,
                        boxShadow: "0 4px 14px rgba(var(--pink-deep-rgb),.1)",
                      }}>
                      <BlurImage src={cldThumb(it.imageUrl, 280)} alt={`doodle by ${it.name}`} wrapperStyle={{ width: "100%", height: "100%" }} style={{ objectFit: "cover" }} />
                    </motion.button>
                    <span style={{ display: "block", fontFamily: SANS, fontSize: "0.65rem", color: "var(--muted)", marginTop: "0.25rem", textAlign: "center" }}>
                      {it.name ? `${it.name} · ` : ""}{fmt(it.createdAt)}
                    </span>
                    <Tip label="delete" placement="left" style={{ position: "absolute", top: 6, right: 6, zIndex: 4 }}>
                      <button onClick={() => remove(it.id)} aria-label="delete doodle"
                        style={{
                          width: 24, height: 24, borderRadius: "50%",
                          background: "rgba(0,0,0,.55)", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.7rem",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>✕</button>
                    </Tip>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          <AnimatePresence>
            {lightbox && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
                style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,.92)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}
              >
                <motion.img src={lightbox} alt="" initial={{ scale: 0.85 }} animate={{ scale: 1 }} exit={{ scale: 0.85 }}
                  style={{ maxWidth: "90vw", maxHeight: "85vh", objectFit: "contain", borderRadius: 12, background: "#fff" }}
                  onClick={(e) => e.stopPropagation()} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
