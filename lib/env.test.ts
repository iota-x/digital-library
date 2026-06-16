/**
 * lib/env loud-failure tests.
 *
 * The point of `serverEnv` is to fail with a clear error name when a
 * required variable is missing — instead of letting `process.env.X!`
 * silently propagate `undefined`. These tests assert that contract.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("serverEnv", () => {
  // Ensure a clean module cache + env per test
  beforeEach(() => {
    vi.resetModules();
    delete process.env.JWT_SECRET;
    delete process.env.MONGODB_URI;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
    delete process.env.VAPID_SUBJECT;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
  });

  it("throws a named error when a required var is missing", async () => {
    const { serverEnv } = await import("./env");
    expect(() => serverEnv.JWT_SECRET).toThrow(/JWT_SECRET/);
    expect(() => serverEnv.MONGODB_URI).toThrow(/MONGODB_URI/);
    expect(() => serverEnv.CLOUDINARY_API_KEY).toThrow(/CLOUDINARY_API_KEY/);
  });

  it("returns the value when set", async () => {
    process.env.JWT_SECRET = "secret-xyz";
    process.env.MONGODB_URI = "mongodb://localhost/test";
    const { serverEnv } = await import("./env");
    expect(serverEnv.JWT_SECRET).toBe("secret-xyz");
    expect(serverEnv.MONGODB_URI).toBe("mongodb://localhost/test");
  });

  it("returns empty string for optional missing vars (no throw)", async () => {
    const { serverEnv } = await import("./env");
    expect(serverEnv.RESEND_API_KEY).toBe("");
    expect(serverEnv.SPOTIFY_CLIENT_ID).toBe("");
    expect(serverEnv.NOTIFY_EMAIL_1).toBe("");
  });

  it("EMAIL_FROM falls back to a sane default when unset", async () => {
    const { serverEnv } = await import("./env");
    expect(serverEnv.EMAIL_FROM).toMatch(/onboarding@resend\.dev/);
  });
});

describe("publicEnv", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    delete process.env.NEXT_PUBLIC_APP_NAME;
  });

  it("returns empty string for missing optional public vars", async () => {
    const { publicEnv } = await import("./env");
    expect(publicEnv.CLOUDINARY_CLOUD_NAME).toBe("");
    expect(publicEnv.VAPID_PUBLIC_KEY).toBe("");
  });

  it("APP_NAME falls back to 'Us' when unset", async () => {
    const { publicEnv } = await import("./env");
    expect(publicEnv.APP_NAME).toBe("Us");
  });
});
