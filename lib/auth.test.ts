/**
 * Auth session helper tests.
 *
 * Covers the signSession/verifySession round-trip and the bad-token paths.
 * Mocks the env so JWT_SECRET is deterministic per run.
 */
import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-do-not-use-in-prod";
});

// Import after env is set so lib/env's eager check sees a value.
const { signSession, verifySession } = await import("./auth");

const payload = {
  userId: "u-1",
  coupleId: "c-1",
  name: "Test User",
  role: "creator" as const,
};

describe("signSession + verifySession", () => {
  it("round-trips a payload", async () => {
    const token = await signSession(payload);
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // JWT shape

    const back = await verifySession(token);
    expect(back).not.toBeNull();
    expect(back!.userId).toBe(payload.userId);
    expect(back!.coupleId).toBe(payload.coupleId);
    expect(back!.name).toBe(payload.name);
    expect(back!.role).toBe(payload.role);
  });

  it("returns null for a tampered token", async () => {
    const token = await signSession(payload);
    const tampered = token.slice(0, -3) + "xyz";
    expect(await verifySession(tampered)).toBeNull();
  });

  it("returns null for nonsense input", async () => {
    expect(await verifySession("not-a-token")).toBeNull();
    expect(await verifySession("")).toBeNull();
  });
});
