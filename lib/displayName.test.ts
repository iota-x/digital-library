/**
 * Name-resolution tests — the single rule that decides whether a person is
 * shown by their given name or the nickname their partner gave them.
 *
 * Covers the server resolver `senderDisplayName` (reads the couple doc) and the
 * pure client helpers `displayName` / `partnerDisplayName` (read a UserInfo).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { displayName, partnerDisplayName, type UserInfo } from "@/lib/userStore";

const findOne = vi.fn();
vi.mock("@/lib/mongo", () => ({
  getCol: vi.fn(async () => ({ findOne })),
}));

const { senderDisplayName } = await import("@/lib/displayName");

// A real 24-hex id — senderDisplayName builds an ObjectId from it, which throws
// (and falls back) on anything malformed.
const COUPLE_ID = "507f1f77bcf86cd799439011";
const creator = { userId: "u-1", coupleId: COUPLE_ID, name: "Ankit", role: "creator" as const };
const partner = { userId: "u-2", coupleId: COUPLE_ID, name: "Juhi",  role: "partner" as const };

beforeEach(() => {
  findOne.mockReset();
});

describe("senderDisplayName", () => {
  it("returns the creator's nickname (person1 slot) when switched on", async () => {
    findOne.mockResolvedValue({ person1Nickname: "babe", person1NicknameOn: true });
    expect(await senderDisplayName(creator)).toBe("babe");
  });

  it("returns the given name when the nickname is switched off", async () => {
    findOne.mockResolvedValue({ person1Nickname: "babe", person1NicknameOn: false });
    expect(await senderDisplayName(creator)).toBe("Ankit");
  });

  it("reads the partner's own slot (person2) for the partner role", async () => {
    findOne.mockResolvedValue({ person2Nickname: "cutie", person2NicknameOn: true });
    expect(await senderDisplayName(partner)).toBe("cutie");
  });

  it("falls back to the given name when no nickname is set", async () => {
    findOne.mockResolvedValue({ person1Name: "Ankit" });
    expect(await senderDisplayName(creator)).toBe("Ankit");
  });

  it("ignores a blank/whitespace nickname even when switched on", async () => {
    findOne.mockResolvedValue({ person1Nickname: "   ", person1NicknameOn: true });
    expect(await senderDisplayName(creator)).toBe("Ankit");
  });

  it("falls back to the given name when the couple doc is missing", async () => {
    findOne.mockResolvedValue(null);
    expect(await senderDisplayName(creator)).toBe("Ankit");
  });

  it("never throws — a DB error degrades to the given name", async () => {
    findOne.mockRejectedValue(new Error("db down"));
    expect(await senderDisplayName(creator)).toBe("Ankit");
  });
});

function user(overrides: Partial<UserInfo>): UserInfo {
  return {
    userId: "u-1", coupleId: COUPLE_ID, name: "Ankit", role: "creator",
    partnerName: "Juhi", nickname: null, nicknameOn: false,
    partnerNickname: null, partnerNicknameOn: false,
    avatarUrl: null, partnerAvatarUrl: null, inviteCode: null,
    startDate: "2026-03-11", settings: {} as UserInfo["settings"],
    ...overrides,
  };
}

describe("displayName / partnerDisplayName", () => {
  it("return empty strings for a null user", () => {
    expect(displayName(null)).toBe("");
    expect(partnerDisplayName(null)).toBe("");
  });

  it("show the given names when no nickname is active", () => {
    const u = user({});
    expect(displayName(u)).toBe("Ankit");
    expect(partnerDisplayName(u)).toBe("Juhi");
  });

  it("show your nickname (set by your partner) when switched on", () => {
    expect(displayName(user({ nickname: "babe", nicknameOn: true }))).toBe("babe");
  });

  it("show the partner's nickname (set by you) when switched on", () => {
    expect(partnerDisplayName(user({ partnerNickname: "cutie", partnerNicknameOn: true }))).toBe("cutie");
  });

  it("fall back to the given name when the toggle is on but no nickname is set", () => {
    expect(displayName(user({ nickname: null, nicknameOn: true }))).toBe("Ankit");
    expect(partnerDisplayName(user({ partnerNickname: "", partnerNicknameOn: true }))).toBe("Juhi");
  });

  it("keep the given name when a nickname exists but the toggle is off", () => {
    expect(displayName(user({ nickname: "babe", nicknameOn: false }))).toBe("Ankit");
    expect(partnerDisplayName(user({ partnerNickname: "cutie", partnerNicknameOn: false }))).toBe("Juhi");
  });
});
