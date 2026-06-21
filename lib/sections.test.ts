import { describe, it, expect } from "vitest";
import { orderedKeys, HOME_SECTIONS } from "./sections";

describe("orderedKeys", () => {
  const canon = ["a", "b", "c", "d"];

  it("returns canonical order when no saved order", () => {
    expect(orderedKeys(canon)).toEqual(canon);
    expect(orderedKeys(canon, [])).toEqual(canon);
  });

  it("applies the saved order", () => {
    expect(orderedKeys(canon, ["c", "a", "b", "d"])).toEqual(["c", "a", "b", "d"]);
  });

  it("appends canonical keys missing from the saved order (new sections show up)", () => {
    expect(orderedKeys(canon, ["c", "a"])).toEqual(["c", "a", "b", "d"]);
  });

  it("drops unknown/stale keys from the saved order", () => {
    expect(orderedKeys(canon, ["x", "c", "zzz", "a"])).toEqual(["c", "a", "b", "d"]);
  });

  it("home registry keys are unique and well-formed", () => {
    const keys = HOME_SECTIONS.map(s => s.key);
    expect(new Set(keys).size).toBe(keys.length);
    HOME_SECTIONS.forEach(s => { expect(s.label).toBeTruthy(); expect(s.emoji).toBeTruthy(); });
  });
});
