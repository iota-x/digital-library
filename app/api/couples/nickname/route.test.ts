/**
 * Nickname API route tests.
 *
 * Mocks the DB + SSE and the session, but runs the REAL withAuth wrapper and
 * validation. Asserts the core invariant: a user writes their *partner's*
 * person slot, and the toggle can't be on without nickname text.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const updateOne = vi.fn().mockResolvedValue({});
const broadcastToCouple = vi.fn();

// Mutable role so a single getSession mock can act as either partner.
const h = vi.hoisted(() => ({ role: "creator" as "creator" | "partner" }));

vi.mock("@/lib/mongo", () => ({ getCol: vi.fn(async () => ({ updateOne })) }));
vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(async () => ({
    userId: "u-1", coupleId: "507f1f77bcf86cd799439011", name: "Ankit", role: h.role,
  })),
}));
vi.mock("@/lib/sseBroadcast", () => ({ broadcastToCouple }));

const { PUT } = await import("./route");

function req(body: unknown) {
  return new NextRequest("http://localhost/api/couples/nickname", {
    method: "PUT",
    headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  updateOne.mockClear();
  broadcastToCouple.mockClear();
  h.role = "creator";
});

describe("PUT /api/couples/nickname", () => {
  it("the creator writes the partner's slot (person2) and broadcasts it", async () => {
    const res = await PUT(req({ nickname: "babe", on: true }), undefined as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, nickname: "babe", on: true });

    const [, update] = updateOne.mock.calls[0];
    expect(update.$set).toEqual({ person2Nickname: "babe", person2NicknameOn: true });

    expect(broadcastToCouple).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439011",
      expect.objectContaining({ type: "nickname:update", target: "person2", nickname: "babe", on: true }),
    );
  });

  it("the partner writes the creator's slot (person1)", async () => {
    h.role = "partner";
    await PUT(req({ nickname: "cutie", on: true }), undefined as never);
    const [, update] = updateOne.mock.calls[0];
    expect(update.$set).toEqual({ person1Nickname: "cutie", person1NicknameOn: true });
  });

  it("forces the toggle off when the nickname is cleared", async () => {
    const res = await PUT(req({ nickname: "", on: true }), undefined as never);
    expect(await res.json()).toEqual({ ok: true, nickname: "", on: false });
    const [, update] = updateOne.mock.calls[0];
    expect(update.$set).toEqual({ person2Nickname: "", person2NicknameOn: false });
  });

  it("trims surrounding whitespace from the nickname", async () => {
    await PUT(req({ nickname: "  my love  ", on: true }), undefined as never);
    const [, update] = updateOne.mock.calls[0];
    expect(update.$set.person2Nickname).toBe("my love");
  });

  it("rejects a non-boolean `on` with 400", async () => {
    const res = await PUT(req({ nickname: "babe" }), undefined as never);
    expect(res.status).toBe(400);
    expect(updateOne).not.toHaveBeenCalled();
  });

  it("rejects an over-long nickname with 400", async () => {
    const res = await PUT(req({ nickname: "x".repeat(41), on: true }), undefined as never);
    expect(res.status).toBe(400);
    expect(updateOne).not.toHaveBeenCalled();
  });
});
