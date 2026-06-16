"use client";
import type { Sticker } from "@/lib/calendarStore";

/**
 * Read-only sticker layer.
 *
 * Stickers are positioned by 0–1 fractional coordinates so the same data
 * renders correctly at any size. Mount inside a `position: relative`
 * container that wraps just the photo (the wrapper's bounding box is what
 * `x: 0.5, y: 0.5` resolves against).
 *
 * `scale` shrinks every sticker uniformly — useful for thumbnails (~0.4)
 * vs full lightbox view (1.0).
 */
export default function StickerOverlay({
  stickers,
  scale = 1,
}: {
  stickers: Sticker[] | undefined;
  scale?: number;
}) {
  if (!stickers || stickers.length === 0) return null;
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        borderRadius: "inherit",
      }}
    >
      {stickers.map(s => (
        <span
          key={s.id}
          style={{
            position: "absolute",
            left: `${s.x * 100}%`,
            top: `${s.y * 100}%`,
            transform: "translate(-50%, -50%)",
            fontSize: `${s.size * scale}rem`,
            lineHeight: 1,
            filter: "drop-shadow(0 2px 6px rgba(0,0,0,.55))",
            userSelect: "none",
            // Avoid the cursor pointer on read-only overlay
            cursor: "default",
          }}
        >
          {s.emoji}
        </span>
      ))}
    </div>
  );
}
