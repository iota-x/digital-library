/**
 * Admin authorization tests.
 *
 * Covers the ADMIN_EMAILS parsing and the fail-closed isAdminUserId gate:
 * empty env denies everyone, a listed email is allowed (case-insensitively),
 * an unlisted email is denied, and a bad ObjectId never throws.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock Mongo so isAdminUserId resolves a fake user by id.
const findOne = vi.fn();
vi.mock("./mongo", () => ({
  getCol: vi.fn(async () => ({ findOne })),
}));

beforeEach(() => {
  vi.resetModules();
  findOne.mockReset();
  delete process.env.ADMIN_EMAILS;
});

const VALID_ID = "507f1f77bcf86cd799439011"; // a syntactically valid ObjectId

describe("adminEmailSet", () => {
  it("parses, trims, lowercases and drops blanks", async () => {
    process.env.ADMIN_EMAILS = " A@x.com , b@Y.com ,, ";
    const { adminEmailSet } = await import("./admin");
    const set = adminEmailSet();
    expect([...set].sort()).toEqual(["a@x.com", "b@y.com"]);
  });

  it("is empty when the env is unset", async () => {
    const { adminEmailSet } = await import("./admin");
    expect(adminEmailSet().size).toBe(0);
  });
});

describe("isAdminUserId", () => {
  it("denies everyone when ADMIN_EMAILS is unset (fail closed)", async () => {
    const { isAdminUserId } = await import("./admin");
    expect(await isAdminUserId(VALID_ID)).toBe(false);
    expect(findOne).not.toHaveBeenCalled(); // short-circuits before any DB call
  });

  it("allows a user whose email is on the list (case-insensitive)", async () => {
    process.env.ADMIN_EMAILS = "admin@example.com";
    findOne.mockResolvedValue({ email: "Admin@Example.com" });
    const { isAdminUserId } = await import("./admin");
    expect(await isAdminUserId(VALID_ID)).toBe(true);
  });

  it("denies a user whose email is not on the list", async () => {
    process.env.ADMIN_EMAILS = "admin@example.com";
    findOne.mockResolvedValue({ email: "someone@else.com" });
    const { isAdminUserId } = await import("./admin");
    expect(await isAdminUserId(VALID_ID)).toBe(false);
  });

  it("denies (without throwing) when the user is missing", async () => {
    process.env.ADMIN_EMAILS = "admin@example.com";
    findOne.mockResolvedValue(null);
    const { isAdminUserId } = await import("./admin");
    expect(await isAdminUserId(VALID_ID)).toBe(false);
  });

  it("denies a malformed id without hitting the DB", async () => {
    process.env.ADMIN_EMAILS = "admin@example.com";
    const { isAdminUserId } = await import("./admin");
    expect(await isAdminUserId("not-an-object-id")).toBe(false);
    expect(findOne).not.toHaveBeenCalled();
  });
});
