import type { Sticker } from "@/lib/calendarStore";

/** A small, opinionated palette. Three rows of seven so the picker
 *  fits on a phone without horizontal scroll. Tweak freely — this is
 *  the source of truth for what's tap-droppable. */
export const STICKER_PALETTE: string[] = [
  "🌸", "🌷", "💗", "💕", "🩷", "💖", "💝",
  "✨", "⭐", "🌟", "💫", "🎀", "🩰", "🌙",
  "🥺", "😘", "🥰", "😍", "👀", "📸", "💌",
];

/** Default size for a freshly-dropped sticker. */
export const DEFAULT_STICKER_SIZE = 2.4;

export function makeSticker(emoji: string, x: number, y: number, size = DEFAULT_STICKER_SIZE): Sticker {
  return {
    id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    emoji,
    x: clamp01(x),
    y: clamp01(y),
    size,
  };
}

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}
