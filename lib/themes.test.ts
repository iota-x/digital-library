import { describe, it, expect } from "vitest";
import {
  DEFAULT_SETTINGS,
  DEFAULT_MEMORY_CARDS,
  THEMES,
  sectionVisible,
  getLoveNotes,
  getMemoryCards,
  type CoupleSettings,
} from "./themes";

describe("DEFAULT_SETTINGS", () => {
  it("has all expected section keys for all three pages", () => {
    expect(Object.keys(DEFAULT_SETTINGS.sections).sort()).toEqual(["home", "journal", "shared"]);
    expect(DEFAULT_SETTINGS.sections.home).toMatchInlineSnapshot(`
      {
        "showCapsuleTeaser": true,
        "showFinal": true,
        "showMemoryCards": true,
        "showTimer": true,
        "showVoiceNotes": true,
      }
    `);
    expect(DEFAULT_SETTINGS.sections.journal).toMatchInlineSnapshot(`
      {
        "showAnniversaryBanner": true,
        "showMonthlyRecap": true,
        "showStreak": true,
        "showSurpriseMe": true,
      }
    `);
    expect(DEFAULT_SETTINGS.sections.shared).toMatchInlineSnapshot(`
      {
        "showBucketList": true,
        "showSpotify": true,
        "showWatchlist": true,
      }
    `);
  });

  it("ships sane defaults", () => {
    expect(DEFAULT_SETTINGS.theme).toBe("pink");
    expect(DEFAULT_SETTINGS.loveNotes.length).toBeGreaterThan(0);
    expect(DEFAULT_SETTINGS.memoryCards.length).toBeGreaterThan(0);
  });
});

describe("THEMES", () => {
  it("every theme has a unique id", () => {
    const ids = THEMES.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every theme has all visual fields populated", () => {
    for (const t of THEMES) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.emoji).toBeTruthy();
      expect(t.swatch).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe("sectionVisible", () => {
  it("defaults to visible when settings are missing", () => {
    expect(sectionVisible(null, "home", "showTimer")).toBe(true);
    expect(sectionVisible(undefined, "journal", "showStreak")).toBe(true);
  });

  it("returns false only when explicitly disabled", () => {
    const s: CoupleSettings = {
      ...DEFAULT_SETTINGS,
      sections: {
        ...DEFAULT_SETTINGS.sections,
        home: { ...DEFAULT_SETTINGS.sections.home, showTimer: false },
      },
    };
    expect(sectionVisible(s, "home", "showTimer")).toBe(false);
    expect(sectionVisible(s, "home", "showFinal")).toBe(true);
  });

  it("treats unknown keys as visible", () => {
    expect(sectionVisible(DEFAULT_SETTINGS, "home", "showSomethingNew")).toBe(true);
  });
});

describe("getLoveNotes", () => {
  it("falls back to defaults when missing or empty", () => {
    expect(getLoveNotes(null)).toEqual(DEFAULT_SETTINGS.loveNotes);
    expect(getLoveNotes(undefined)).toEqual(DEFAULT_SETTINGS.loveNotes);
    expect(getLoveNotes({ ...DEFAULT_SETTINGS, loveNotes: [] })).toEqual(DEFAULT_SETTINGS.loveNotes);
  });

  it("returns user notes when present", () => {
    const custom = ["a", "b", "c"];
    expect(getLoveNotes({ ...DEFAULT_SETTINGS, loveNotes: custom })).toEqual(custom);
  });
});

describe("getMemoryCards", () => {
  it("falls back to defaults when missing or empty", () => {
    expect(getMemoryCards(null)).toEqual(DEFAULT_MEMORY_CARDS);
    expect(getMemoryCards({ ...DEFAULT_SETTINGS, memoryCards: [] })).toEqual(DEFAULT_MEMORY_CARDS);
  });

  it("returns user cards when present", () => {
    const custom = [{ title: "x", body: "y" }];
    expect(getMemoryCards({ ...DEFAULT_SETTINGS, memoryCards: custom })).toEqual(custom);
  });
});
