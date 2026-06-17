/**
 * Minimal store-only (no compression) ZIP writer — pure browser, no deps.
 *
 * The app's media is already compressed (JPEG/WebP/WebM), so "store" loses
 * almost nothing while keeping this tiny and dependency-free (the project pins
 * a deliberately small dependency set). Builds the whole archive in memory and
 * returns a Blob — fine for a couple's media, not meant for multi-GB exports.
 */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export interface ZipEntry { name: string; data: Uint8Array }

export function buildZip(entries: ZipEntry[]): Blob {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const e of entries) {
    const nameBytes = enc.encode(e.name);
    const crc = crc32(e.data);
    const size = e.data.length;

    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true);
    lh.setUint16(4, 20, true);     // version needed
    lh.setUint16(6, 0x0800, true); // flags: UTF-8 filename
    lh.setUint16(8, 0, true);      // method: store
    lh.setUint16(10, 0, true);     // mod time
    lh.setUint16(12, 0, true);     // mod date
    lh.setUint32(14, crc, true);
    lh.setUint32(18, size, true);  // compressed size
    lh.setUint32(22, size, true);  // uncompressed size
    lh.setUint16(26, nameBytes.length, true);
    lh.setUint16(28, 0, true);     // extra length
    const lhBytes = new Uint8Array(lh.buffer);
    parts.push(lhBytes, nameBytes, e.data);

    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);     // version made by
    cd.setUint16(6, 20, true);     // version needed
    cd.setUint16(8, 0x0800, true); // flags
    cd.setUint16(10, 0, true);     // method
    cd.setUint16(12, 0, true);
    cd.setUint16(14, 0, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, size, true);
    cd.setUint32(24, size, true);
    cd.setUint16(28, nameBytes.length, true);
    cd.setUint16(30, 0, true);     // extra
    cd.setUint16(32, 0, true);     // comment
    cd.setUint16(34, 0, true);     // disk number
    cd.setUint16(36, 0, true);     // internal attrs
    cd.setUint32(38, 0, true);     // external attrs
    cd.setUint32(42, offset, true);// local header offset
    const cdBytes = new Uint8Array(46 + nameBytes.length);
    cdBytes.set(new Uint8Array(cd.buffer), 0);
    cdBytes.set(nameBytes, 46);
    central.push(cdBytes);

    offset += lhBytes.length + nameBytes.length + size;
  }

  const centralStart = offset;
  let centralSize = 0;
  for (const c of central) { parts.push(c); centralSize += c.length; }

  const eocd = new DataView(new ArrayBuffer(22));
  eocd.setUint32(0, 0x06054b50, true);
  eocd.setUint16(4, 0, true);
  eocd.setUint16(6, 0, true);
  eocd.setUint16(8, entries.length, true);
  eocd.setUint16(10, entries.length, true);
  eocd.setUint32(12, centralSize, true);
  eocd.setUint32(16, centralStart, true);
  eocd.setUint16(20, 0, true);
  parts.push(new Uint8Array(eocd.buffer));

  // Cast: these are all ArrayBuffer-backed Uint8Arrays; the generic
  // Uint8Array<ArrayBufferLike> type just isn't structurally a BlobPart.
  return new Blob(parts as unknown as BlobPart[], { type: "application/zip" });
}
