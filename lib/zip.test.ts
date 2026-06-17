import { describe, it, expect } from "vitest";
import { buildZip } from "./zip";

const u32 = (buf: Uint8Array, off: number) =>
  buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16) | (buf[off + 3] << 24);

describe("buildZip (store-only)", () => {
  it("produces a valid local header + EOCD for one entry", async () => {
    const data = new TextEncoder().encode("hello world");
    const blob = buildZip([{ name: "a.txt", data }]);
    const buf = new Uint8Array(await blob.arrayBuffer());

    // Local file header signature at offset 0.
    expect(u32(buf, 0) >>> 0).toBe(0x04034b50);
    // End-of-central-directory signature appears near the end.
    const eocdOff = buf.length - 22;
    expect(u32(buf, eocdOff) >>> 0).toBe(0x06054b50);
    // EOCD records the entry count (offset 8 within EOCD).
    expect(buf[eocdOff + 10]).toBe(1);
  });

  it("records every entry in the central directory count", async () => {
    const enc = new TextEncoder();
    const blob = buildZip([
      { name: "data.json", data: enc.encode("{}") },
      { name: "photos/001.jpg", data: new Uint8Array([1, 2, 3]) },
      { name: "voice-notes/001.webm", data: new Uint8Array([4, 5]) },
    ]);
    const buf = new Uint8Array(await blob.arrayBuffer());
    const eocdOff = buf.length - 22;
    expect(u32(buf, eocdOff) >>> 0).toBe(0x06054b50);
    expect(buf[eocdOff + 10]).toBe(3); // total entries (little-endian low byte)
    expect(blob.type).toBe("application/zip");
  });

  it("handles an empty archive", async () => {
    const blob = buildZip([]);
    const buf = new Uint8Array(await blob.arrayBuffer());
    expect(buf.length).toBe(22); // just the EOCD
    expect(u32(buf, 0) >>> 0).toBe(0x06054b50);
  });
});
