import { describe, it, expect } from "vitest";
import {
  DAILY_QUESTIONS,
  todayKeyUTC,
  questionIndexForDate,
  questionForDate,
} from "./dailyQuestions";

describe("dailyQuestions", () => {
  it("has a non-empty bank with no blanks", () => {
    expect(DAILY_QUESTIONS.length).toBeGreaterThan(0);
    for (const q of DAILY_QUESTIONS) expect(q.trim().length).toBeGreaterThan(0);
  });

  it("todayKeyUTC formats as YYYY-MM-DD", () => {
    expect(todayKeyUTC(new Date("2026-06-17T23:59:00Z"))).toBe("2026-06-17");
    expect(todayKeyUTC(new Date("2026-01-02T00:00:00Z"))).toBe("2026-01-02");
  });

  it("is deterministic for a given date (both partners get the same Q)", () => {
    const a = questionForDate("2026-06-17");
    const b = questionForDate("2026-06-17");
    expect(a).toEqual(b);
    expect(a.text).toBe(DAILY_QUESTIONS[a.id]);
  });

  it("advances by one each day and wraps modulo the bank size", () => {
    const i1 = questionIndexForDate("2026-06-17");
    const i2 = questionIndexForDate("2026-06-18");
    expect(i2).toBe((i1 + 1) % DAILY_QUESTIONS.length);
  });

  it("returns a valid in-range index for arbitrary dates", () => {
    for (const d of ["2020-01-01", "2026-12-31", "1999-07-04", "2030-02-28"]) {
      const idx = questionIndexForDate(d);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(DAILY_QUESTIONS.length);
    }
  });

  it("falls back to index 0 for an unparseable date", () => {
    expect(questionIndexForDate("not-a-date")).toBe(0);
  });
});
