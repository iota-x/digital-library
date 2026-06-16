import { describe, it, expect } from "vitest";
import { STICKER_PALETTE, makeSticker, DEFAULT_STICKER_SIZE } from "./stickers";

describe("STICKER_PALETTE", () => {
  it("has at least 12 emojis, no duplicates", () => {
    expect(STICKER_PALETTE.length).toBeGreaterThanOrEqual(12);
    expect(new Set(STICKER_PALETTE).size).toBe(STICKER_PALETTE.length);
  });

  it("every entry is a non-empty string", () => {
    for (const e of STICKER_PALETTE) {
      expect(typeof e).toBe("string");
      expect(e.length).toBeGreaterThan(0);
    }
  });
});

describe("makeSticker", () => {
  it("clamps x and y into [0, 1]", () => {
    expect(makeSticker("🌸", -3, 5)).toMatchObject({ emoji: "🌸", x: 0, y: 1 });
    expect(makeSticker("💗", 0.5, 0.7)).toMatchObject({ x: 0.5, y: 0.7 });
  });

  it("defaults the size and emits a unique id", () => {
    const a = makeSticker("✨", 0.1, 0.1);
    const b = makeSticker("✨", 0.1, 0.1);
    expect(a.size).toBe(DEFAULT_STICKER_SIZE);
    expect(a.id).not.toBe(b.id);
    expect(a.id).toMatch(/^s-/);
  });

  it("accepts a custom size", () => {
    expect(makeSticker("⭐", 0.3, 0.3, 5).size).toBe(5);
  });
});
