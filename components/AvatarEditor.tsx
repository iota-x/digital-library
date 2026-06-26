"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { uploadToCloudinary, UploadError } from "@/lib/cloudUpload";
import { updateAvatar, getUser } from "@/lib/userStore";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { SERIF, SANS } from "@/lib/typography";
import Tip from "@/components/Tip";

/**
 * Crop-to-square avatar editor.
 *
 * Pick a photo → drag to reposition + zoom → the visible square is rendered to
 * a 512×512 canvas and uploaded to Cloudinary (folder "avatars"), then saved to
 * the couple doc via PUT /api/couples/avatar. Because we bake the crop into the
 * stored image, the polaroid just shows it center-filled and it's always framed
 * exactly how the person chose.
 */

const VIEWPORT = 300; // px — the square crop window
const OUTPUT = 512; // px — exported square size

interface Props {
  open: boolean;
  onClose: () => void;
  /** Existing avatar to show as the starting point / for the "remove" option. */
  currentUrl?: string | null;
}

export default function AvatarEditor({ open, onClose, currentUrl }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const drag = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  useFocusTrap(dialogRef, { active: open, onEscape: onClose });

  // Reset transient state whenever the editor is reopened.
  useEffect(() => {
    if (!open) {
      setSrc(null); setNatural(null); setError(null); setBusy(false);
    }
  }, [open]);

  // Clamp the offset so the image always fully covers the viewport.
  const clamp = useCallback((ox: number, oy: number, s: number, nat: { w: number; h: number }) => {
    const dw = nat.w * s, dh = nat.h * s;
    return {
      x: Math.min(0, Math.max(VIEWPORT - dw, ox)),
      y: Math.min(0, Math.max(VIEWPORT - dh, oy)),
    };
  }, []);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please choose an image."); return; }
    setError(null);
    const url = URL.createObjectURL(file);
    setSrc(url);
  };

  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const el = e.currentTarget;
    imgRef.current = el;
    const w = el.naturalWidth, h = el.naturalHeight;
    const base = Math.max(VIEWPORT / w, VIEWPORT / h); // "cover" scale
    const nat = { w, h };
    setNatural(nat);
    setMinScale(base);
    setScale(base);
    // Center the image in the viewport.
    setOffset(clamp((VIEWPORT - w * base) / 2, (VIEWPORT - h * base) / 2, base, nat));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!natural) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || !natural) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    setOffset(clamp(drag.current.ox + dx, drag.current.oy + dy, scale, natural));
  };
  const onPointerUp = () => { drag.current = null; };

  // Zoom around the viewport center so the framed subject stays put.
  const applyZoom = (next: number) => {
    if (!natural) return;
    const s2 = Math.min(minScale * 4, Math.max(minScale, next));
    const cx = (VIEWPORT / 2 - offset.x) / scale;
    const cy = (VIEWPORT / 2 - offset.y) / scale;
    const ox = VIEWPORT / 2 - cx * s2;
    const oy = VIEWPORT / 2 - cy * s2;
    setScale(s2);
    setOffset(clamp(ox, oy, s2, natural));
  };

  const exportSquare = (): Promise<Blob> => new Promise((resolve, reject) => {
    const img = imgRef.current;
    if (!img || !natural) return reject(new Error("no image"));
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT; canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return reject(new Error("no canvas"));
    // Source rect that the viewport currently shows.
    const sx = -offset.x / scale;
    const sy = -offset.y / scale;
    const sSize = VIEWPORT / scale;
    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUTPUT, OUTPUT);
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("export failed"))),
      "image/jpeg",
      0.9,
    );
  });

  const save = async () => {
    setBusy(true); setError(null);
    try {
      const blob = await exportSquare();
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      const url = await uploadToCloudinary(file, { folder: "avatars" });
      const res = await fetch("/api/couples/avatar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: url }),
      });
      if (!res.ok) throw new Error("Could not save avatar");
      updateAvatar("me", url);
      onClose();
    } catch (e) {
      setError(e instanceof UploadError ? e.message : (e as Error).message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/couples/avatar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: "" }),
      });
      if (!res.ok) throw new Error("Could not remove avatar");
      updateAvatar("me", null);
      onClose();
    } catch (e) {
      setError((e as Error).message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const firstName = (getUser()?.name ?? "").split(" ")[0];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={busy ? undefined : onClose}
            style={{ position: "fixed", inset: 0, zIndex: 9980, background: "rgba(0,0,0,.55)", WebkitBackdropFilter: "blur(8px)", backdropFilter: "blur(8px)" }}
          />
          <motion.div
            ref={dialogRef}
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            role="dialog" aria-modal="true" aria-label="Edit your photo"
            className="mobile-sheet"
            style={{
              position: "fixed", zIndex: 9981, top: "50%", left: "50%", transform: "translate(-50%,-50%)",
              width: "min(380px, 94vw)", background: "var(--cream)", border: "1.5px solid var(--pink-mid)",
              borderRadius: 24, padding: "1.6rem 1.4rem", textAlign: "center",
              // Cap to the viewport and scroll inside — the 300px crop window +
              // slider + buttons otherwise overflowed short screens, forcing a
              // zoom-out to reach "save".
              maxHeight: "calc(100dvh - 2rem)",
              overflowY: "auto",
              boxShadow: "0 32px 80px rgba(var(--pink-deep-rgb),.3)",
            }}
          >
            <h2 style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "1.4rem", color: "var(--pink-deep)", margin: "0 0 0.3rem", fontWeight: 400 }}>
              {firstName ? `${firstName}'s photo` : "your photo"}
            </h2>
            <p style={{ fontFamily: SANS, fontSize: "0.82rem", color: "var(--muted)", margin: "0 0 1rem" }}>
              {src ? "drag to reposition · pinch or slide to zoom" : "pick a photo for your polaroid 🩷"}
            </p>

            {!src ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem", alignItems: "center" }}>
                <div style={{
                  width: VIEWPORT, height: VIEWPORT, maxWidth: "100%", borderRadius: 16,
                  background: "linear-gradient(135deg,var(--pink-light),var(--pink-mid))",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem",
                  border: "2px dashed var(--pink)", margin: "0 auto",
                }}>
                  {currentUrl
                    ? <img src={currentUrl} alt="current avatar" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 14 }} />
                    : "📷"}
                </div>
                <label style={btnPrimary}>
                  {currentUrl ? "choose a new photo" : "choose a photo"}
                  <input type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
                </label>
                {currentUrl && (
                  <button onClick={remove} disabled={busy} style={btnGhost}>remove photo</button>
                )}
              </div>
            ) : (
              <>
                <div
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  onWheel={(e) => { applyZoom(scale * (e.deltaY < 0 ? 1.08 : 0.93)); }}
                  style={{
                    width: VIEWPORT, height: VIEWPORT, maxWidth: "100%", margin: "0 auto",
                    position: "relative", overflow: "hidden", borderRadius: 16, cursor: "grab",
                    touchAction: "none", background: "#000",
                    boxShadow: "inset 0 0 0 2px rgba(255,255,255,.7), inset 0 0 0 3px var(--pink)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src} alt="" onLoad={onImgLoad} draggable={false}
                    style={{
                      position: "absolute", left: offset.x, top: offset.y,
                      width: natural ? natural.w * scale : "auto",
                      height: natural ? natural.h * scale : "auto",
                      maxWidth: "none", userSelect: "none", pointerEvents: "none",
                    }}
                  />
                  {/* center guide ring */}
                  <div style={{ position: "absolute", inset: 0, borderRadius: 16, pointerEvents: "none", boxShadow: "inset 0 0 0 9999px rgba(0,0,0,0)" }} />
                </div>
                <input
                  type="range" min={minScale} max={minScale * 4} step={0.001} value={scale}
                  onChange={(e) => applyZoom(parseFloat(e.target.value))}
                  aria-label="zoom"
                  style={{ width: VIEWPORT, maxWidth: "100%", margin: "0.9rem auto 0.2rem", accentColor: "var(--pink-deep)" }}
                />
                <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.8rem" }}>
                  <button onClick={() => { setSrc(null); setNatural(null); }} disabled={busy} style={{ ...btnGhost, flex: 1 }}>back</button>
                  <button onClick={save} disabled={busy} style={{ ...btnPrimary, flex: 1 }}>{busy ? "saving…" : "save 🩷"}</button>
                </div>
              </>
            )}

            {error && <p style={{ color: "var(--pink-deep)", fontFamily: SANS, fontSize: "0.8rem", marginTop: "0.8rem" }}>{error}</p>}

            {!busy && (
              <Tip label="close" placement="left" style={{ position: "absolute", top: 10, right: 14, zIndex: 5 }}>
                <button onClick={onClose} aria-label="close"
                  style={{ border: "none", background: "none", fontSize: "1.3rem", color: "var(--muted)", cursor: "pointer" }}>
                  ✕
                </button>
              </Tip>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

const btnPrimary: React.CSSProperties = {
  fontFamily: SANS, fontSize: "0.9rem", fontWeight: 700, color: "#fff",
  background: "linear-gradient(135deg,var(--pink),var(--pink-deep))",
  border: "none", borderRadius: 50, padding: "0.7rem 1.4rem", cursor: "pointer",
  boxShadow: "0 6px 22px rgba(var(--pink-deep-rgb),.32)", display: "inline-block",
};
const btnGhost: React.CSSProperties = {
  fontFamily: SANS, fontSize: "0.85rem", fontWeight: 600, color: "var(--pink-deep)",
  background: "rgba(var(--pink-rgb),.1)", border: "1px solid var(--pink-mid)",
  borderRadius: 50, padding: "0.6rem 1.2rem", cursor: "pointer",
};
