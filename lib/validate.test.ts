import { describe, it, expect } from "vitest";
import { v } from "./validate";

describe("v.string", () => {
  it("accepts strings and enforces min/max", () => {
    expect(v.string()("hi")).toEqual({ ok: true, value: "hi" });
    expect(v.string({ min: 2 })("a").ok).toBe(false);
    expect(v.string({ max: 2 })("abc").ok).toBe(false);
  });
  it("rejects non-strings", () => {
    expect(v.string()(5).ok).toBe(false);
    expect(v.string()(null).ok).toBe(false);
  });
  it("trims when asked", () => {
    expect(v.string({ trim: true })("  hi  ")).toEqual({ ok: true, value: "hi" });
  });
  it("enforces a pattern", () => {
    const date = v.string({ pattern: /^\d{4}-\d{2}-\d{2}$/ });
    expect(date("2026-06-17").ok).toBe(true);
    expect(date("nope").ok).toBe(false);
  });
});

describe("v.number / v.boolean / v.literal", () => {
  it("validates numbers with bounds and int", () => {
    expect(v.number({ min: 0, max: 10 })(5).ok).toBe(true);
    expect(v.number({ min: 0 })(-1).ok).toBe(false);
    expect(v.number({ int: true })(1.5).ok).toBe(false);
    expect(v.number()(NaN).ok).toBe(false);
  });
  it("validates booleans", () => {
    expect(v.boolean()(true).ok).toBe(true);
    expect(v.boolean()("true").ok).toBe(false);
  });
  it("validates enums via literal", () => {
    const status = v.literal("a", "b");
    expect(status("a").ok).toBe(true);
    expect(status("c").ok).toBe(false);
  });
});

describe("v.optional / v.array", () => {
  it("optional allows undefined but still validates present values", () => {
    const opt = v.optional(v.string({ min: 1 }));
    expect(opt(undefined)).toEqual({ ok: true, value: undefined });
    expect(opt("x").ok).toBe(true);
    expect(opt("").ok).toBe(false);
  });
  it("array validates each element and caps length", () => {
    const arr = v.array(v.string(), { max: 2 });
    expect(arr(["a", "b"]).ok).toBe(true);
    expect(arr(["a", "b", "c"]).ok).toBe(false);
    expect(arr(["a", 3]).ok).toBe(false);
    expect(arr("nope").ok).toBe(false);
  });
});

describe("v.object", () => {
  const schema = v.object({
    date: v.string({ min: 1 }),
    mood: v.optional(v.string()),
    special: v.optional(v.boolean()),
  });

  it("accepts a valid object and strips unknown keys", () => {
    const r = schema({ date: "2026-06-17", mood: "🥰", extra: "ignored" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({ date: "2026-06-17", mood: "🥰" });
      expect("extra" in r.value).toBe(false);
    }
  });

  it("reports a path on nested failure", () => {
    const r = schema({ date: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("date");
  });

  it("rejects non-objects", () => {
    expect(schema(null).ok).toBe(false);
    expect(schema([]).ok).toBe(false);
    expect(schema("x").ok).toBe(false);
  });

  it("omits optional keys that are undefined", () => {
    const r = schema({ date: "2026-06-17" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(Object.keys(r.value)).toEqual(["date"]);
  });
});
