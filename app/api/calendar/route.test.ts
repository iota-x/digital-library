/**
 * Calendar API route tests.
 *
 * Mocks the DB + side-effects (SSE, push, weather) and the session, but runs
 * the REAL withAuth wrapper and the REAL in-memory rateLimit — so this also
 * covers the rate-limit integration the review asked about. No Redis is
 * configured in tests, so rateLimit uses its in-memory fixed-window path.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const updateOne = vi.fn().mockResolvedValue({});
const findOne = vi.fn().mockResolvedValue(null); // default: brand-new entry
const deleteOne = vi.fn().mockResolvedValue({});

vi.mock("@/lib/mongo", () => ({
  getCol: vi.fn(async () => ({ findOne, updateOne, deleteOne, find: () => ({ toArray: async () => [] }) })),
}));
vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(async () => ({ userId: "u-1", coupleId: "c-1", name: "Test", role: "creator" })),
}));
vi.mock("@/lib/sseBroadcast", () => ({ broadcastCalendarUpdate: vi.fn(), broadcastToCouple: vi.fn() }));
vi.mock("@/lib/pushNotify", () => ({ sendPushToOtherInCouple: vi.fn() }));
vi.mock("@/lib/weather", () => ({ fetchWeatherSnapshot: vi.fn(async () => null) }));

const { POST } = await import("./route");

function req(body: unknown, ip = "1.2.3.4") {
  return new NextRequest("http://localhost/api/calendar", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  updateOne.mockClear();
  findOne.mockClear();
  findOne.mockResolvedValue(null);
});

describe("POST /api/calendar — validation", () => {
  it("rejects a missing date with 400", async () => {
    const res = await POST(req({ note: "hi" }), undefined as never);
    expect(res.status).toBe(400);
    expect(updateOne).not.toHaveBeenCalled();
  });

  it("rejects a malformed date with 400", async () => {
    const res = await POST(req({ date: "June 3rd" }), undefined as never);
    expect(res.status).toBe(400);
  });

  it("rejects an over-long mood with 400", async () => {
    // Cap bounds the *ciphertext* now (E2EE): mood is generous (1000) but finite.
    const res = await POST(req({ date: "2026-06-17", mood: "x".repeat(1100) }), undefined as never);
    expect(res.status).toBe(400);
  });

  it("accepts a valid entry and upserts it", async () => {
    const res = await POST(req({ date: "2020-01-02", note: "our first day" }, "9.9.9.9"), undefined as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(updateOne).toHaveBeenCalledTimes(1);
    const [filter] = updateOne.mock.calls[0];
    expect(filter).toEqual({ date: "2020-01-02", coupleId: "c-1" });
  });
});

describe("POST /api/calendar — rate limiting", () => {
  it("returns 429 once the per-couple window is exceeded", async () => {
    // scope calendar:write allows 120/min; one IP+couple shares a bucket.
    let sawTooMany = false;
    for (let i = 0; i < 130; i++) {
      const res = await POST(req({ date: "2021-05-05", note: "x" }, "5.5.5.5"), undefined as never);
      if (res.status === 429) { sawTooMany = true; break; }
    }
    expect(sawTooMany).toBe(true);
  });
});
