import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { deflateSync, inflateSync } from "node:zlib";

const IDS = ["hovercraft", "snow-groomer", "hot-rod", "tow-truck"];
const BASE_URL = process.env.CAPTURE_URL ?? "http://127.0.0.1:5173";

// --- Minimal PNG codec (8-bit RGB/RGBA, non-interlaced) for the 4-up. ---
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  Buffer.from(data).copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
function readPng(bytes) {
  let pos = 8;
  let width = 0,
    height = 0,
    colorType = 0;
  const idat = [];
  while (pos < bytes.length) {
    const len = bytes.readUInt32BE(pos);
    const type = bytes.toString("ascii", pos + 4, pos + 8);
    const data = bytes.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || (data[9] !== 2 && data[9] !== 6) || data[12] !== 0)
        throw new Error("unsupported PNG format");
      colorType = data[9];
    } else if (type === "IDAT") {
      idat.push(data);
    }
    pos += 12 + len;
  }
  const bpp = colorType === 2 ? 3 : 4;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const rgba = Buffer.alloc(width * height * 4);
  let p = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[p++];
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? raw[p + x - bpp] : 0;
      const b = y > 0 ? raw[p + x - stride - 1] : 0;
      const c = x >= bpp && y > 0 ? raw[p + x - bpp - stride - 1] : 0;
      let v = raw[p + x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const q = a + b - c;
        const pa = Math.abs(q - a),
          pb = Math.abs(q - b),
          pc = Math.abs(q - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      raw[p + x] = v & 0xff;
    }
    for (let x = 0; x < width; x++) {
      const s = p + x * bpp;
      const d = (y * width + x) * 4;
      rgba[d] = raw[s];
      rgba[d + 1] = raw[s + 1];
      rgba[d + 2] = raw[s + 2];
      rgba[d + 3] = bpp === 4 ? raw[s + 3] : 255;
    }
    p += stride;
  }
  return { width, height, rgba };
}
function writePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgba.subarray(y * stride, (y + 1) * stride)).copy(
      raw,
      y * (stride + 1) + 1,
    );
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 6 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const browser = await chromium.launch({
  args: [
    "--enable-webgl",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1000, height: 600 },
    deviceScaleFactor: 1,
  });
  await page.addInitScript(() => {
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) =>
      raf((t) => {
        if (!window.__captureFreeze) cb(t);
      });
  });
  await page.goto(`${BASE_URL}/?test=vehicle-previews`);
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => {
    window.__game.pause(true);
    window.__captureFreeze = true;
  });
  await page.addStyleTag({
    content:
      "#app > :not(#viewport) { visibility: hidden !important; } #viewport { inset: 0 !important; }",
  });
  await page.setViewportSize({ width: 800, height: 450 });
  await mkdir("public/vehicles", { recursive: true });
  await mkdir("visual-plan", { recursive: true });
  for (const id of IDS) {
    await page.evaluate((id) => {
      const g = window.__game;
      g.startTrack("foundry-run", "easy", id);
      g.place({ x: 0, y: 2.1, z: -95 }, 0);
      g.advanceFrames(45, 1, {});
      g.vehiclePreview();
    }, id);
    await page.waitForTimeout(1800);
    await page.evaluate(() => window.__game.vehiclePreview());
    await page
      .locator("#viewport canvas")
      .screenshot({ path: `public/vehicles/${id}.png` });
    console.log(`Captured ${id}`);
  }
} finally {
  await browser.close();
}

// Stitch the 2x2 contact sheet from the four previews.
const shots = await Promise.all(
  IDS.map((id) => readFile(`public/vehicles/${id}.png`).then(readPng)),
);
const w = shots[0].width;
const h = shots[0].height;
const sheet = Buffer.alloc(w * 2 * h * 2 * 4);
for (let i = 0; i < 4; i++) {
  const { width, height, rgba } = shots[i];
  if (width !== w || height !== h) throw new Error("preview size mismatch");
  const ox = (i % 2) * w;
  const oy = Math.floor(i / 2) * h;
  for (let y = 0; y < h; y++) {
    rgba
      .subarray(y * w * 4, (y + 1) * w * 4)
      .copy(sheet, ((oy + y) * w * 2 + ox) * 4);
  }
}
await writeFile("visual-plan/new-cars-4up.png", writePng(w * 2, h * 2, sheet));
console.log("Wrote visual-plan/new-cars-4up.png");
