import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { officialTracks } from "../src/official-levels";

// In-game screenshots are busy 3D renders; flat geometry/illustration
// renders are an order of magnitude smaller and flatter. Calibrated Nov 2026:
// weakest real preview was 152KB / 10.3k colors (geometry renders were ~15KB).
const MIN_BYTES = 100_000;
const MIN_COLORS = 5_000;

/** Distinct 24-bit colors in an 8-bit non-interlaced RGB/RGBA PNG. */
function distinctColors(bytes: Buffer): number {
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  const bitDepth = bytes[24];
  const colorType = bytes[25];
  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
    throw new Error(`unsupported PNG: depth ${bitDepth} type ${colorType}`);
  }
  const channels = colorType === 6 ? 4 : 3;
  const idat: Buffer[] = [];
  let pos = 8;
  while (pos < bytes.length) {
    const len = bytes.readUInt32BE(pos);
    const type = bytes.toString("ascii", pos + 4, pos + 8);
    if (type === "IDAT") idat.push(bytes.subarray(pos + 8, pos + 8 + len));
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const seen = new Set<number>();
  let p = 0;
  const prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[p++];
    const cur = raw.subarray(p, p + stride);
    p += stride;
    const rec = Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? rec[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      let v = cur[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const pp = a + b - c;
        const pa = Math.abs(pp - a);
        const pb = Math.abs(pp - b);
        const pc = Math.abs(pp - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      rec[i] = v & 255;
    }
    for (let i = 0; i < stride; i += channels) {
      seen.add((rec[i] << 16) | (rec[i + 1] << 8) | rec[i + 2]);
    }
    rec.copy(prev);
  }
  return seen.size;
}

for (const track of officialTracks) {
  it(`${track.id} preview is a real in-game screenshot`, () => {
    const bytes = readFileSync(`public${track.thumbnail}`);
    expect(bytes.length, `${track.id} byte size`).toBeGreaterThan(MIN_BYTES);
    expect(distinctColors(bytes), `${track.id} distinct colors`).toBeGreaterThan(MIN_COLORS);
  });
}
