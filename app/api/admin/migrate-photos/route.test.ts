/**
 * Bulk photo-migration route tests. Mocks Mongo, auth, SSE, and the actual
 * Cloudinary upload (so no network), but runs the real migration logic +
 * withAuth wrapper.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const updateOne = vi.fn().mockResolvedValue({});
let entries: Record<string, unknown>[] = [];

vi.mock("@/lib/mongo", () => ({
  getCol: vi.fn(async () => ({
    find: () => ({ toArray: async () => entries }),
    updateOne,
  })),
}));
vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(async () => ({ userId: "u-1", coupleId: "c-1", name: "Test", role: "creator" })),
}));
vi.mock("@/lib/sseBroadcast", () => ({ broadcastCalendarUpdate: vi.fn(), broadcastToCouple: vi.fn() }));
vi.mock("@/lib/cloudinaryServer", async (orig) => {
  const actual = await orig<typeof import("@/lib/cloudinaryServer")>();
  return {
    ...actual,
    uploadToCloudinaryServer: vi.fn(async () => "https://res.cloudinary.com/demo/image/upload/v1/migrated/x.jpg"),
  };
});

const { POST } = await import("./route");
const post = () => POST(new NextRequest("http://localhost/api/admin/migrate-photos", {
  method: "POST", headers: { "x-forwarded-for": "3.3.3.3" },
}), undefined as never);

beforeEach(() => {
  updateOne.mockClear();
  entries = [];
});

describe("POST /api/admin/migrate-photos", () => {
  it("migrates legacy data: URLs and leaves hosted URLs untouched", async () => {
    entries = [
      { _id: "a", date: "2026-01-01", photos: ["data:image/png;base64,AAAA", "https://hosted/x.jpg"] },
      { _id: "b", date: "2026-01-02", photos: ["https://hosted/y.jpg"] },
      { _id: "c", date: "2026-01-03", photos: [] },
    ];
    const res = await post();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toMatchObject({ ok: true, entriesScanned: 3, entriesUpdated: 1, photosMigrated: 1 });
    expect(json.failures).toEqual([]);
    expect(updateOne).toHaveBeenCalledTimes(1);
    const [filter, update] = updateOne.mock.calls[0];
    expect(filter).toEqual({ _id: "a" });
    expect(update).toEqual({
      $set: { photos: ["https://res.cloudinary.com/demo/image/upload/v1/migrated/x.jpg", "https://hosted/x.jpg"] },
    });
  });

  it("is a no-op when every photo is already hosted", async () => {
    entries = [{ _id: "a", date: "2026-01-01", photos: ["https://hosted/x.jpg"] }];
    const json = await (await post()).json();
    expect(json).toMatchObject({ entriesScanned: 1, entriesUpdated: 0, photosMigrated: 0 });
    expect(updateOne).not.toHaveBeenCalled();
  });

  it("reports a failed upload without aborting and keeps the original", async () => {
    const mod = await import("@/lib/cloudinaryServer");
    (mod.uploadToCloudinaryServer as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("cloudinary 401"));
    entries = [{ _id: "a", date: "2026-01-01", photos: ["data:image/png;base64,BBBB"] }];
    const json = await (await post()).json();
    expect(json.photosMigrated).toBe(0);
    expect(json.entriesUpdated).toBe(0); // nothing changed → no write
    expect(json.failures).toEqual([{ date: "2026-01-01", error: "cloudinary 401" }]);
    expect(updateOne).not.toHaveBeenCalled();
  });
});
