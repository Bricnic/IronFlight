import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

// Derive normal/roughness maps from a diffuse PNG (luminance Sobel) and
// write the repo's diffuse/normal/roughness JPG contract.
// Usage: node scripts/derive-texture-maps.mjs <id> <diffuse.png> [source-note] [tint]
// tint is an optional r,g,b multiplier (e.g. "0.9,0.55,0.72") applied to the
// diffuse first, so bright generations survive the game's hot sun.
// Writes public/textures/<id>_{diffuse,normal,roughness}.jpg and prints the
// manifest asset entry JSON.

const [id, diffusePath, source, tintArg] = process.argv.slice(2);
const tint = (tintArg ?? "1,1,1").split(",").map(Number);
if (!id || !diffusePath) {
  console.error("usage: node scripts/derive-texture-maps.mjs <id> <diffuse.png> [source]");
  process.exit(1);
}

const png = await readFile(diffusePath);
const url = `data:image/png;base64,${png.toString("base64")}`;
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(`<img id="src" src="${url}">`);
await page.waitForFunction(() => document.getElementById("src").complete);
const maps = await page.evaluate((tint) => {
  const img = document.getElementById("src");
  const w = img.naturalWidth, h = img.naturalHeight;
  const src = document.createElement("canvas");
  src.width = w; src.height = h;
  const sctx = src.getContext("2d", { willReadFrequently: true });
  sctx.drawImage(img, 0, 0);
  const raw = sctx.getImageData(0, 0, w, h);
  for (let i = 0; i < raw.data.length; i += 4) {
    raw.data[i] = Math.min(255, raw.data[i] * tint[0]);
    raw.data[i + 1] = Math.min(255, raw.data[i + 1] * tint[1]);
    raw.data[i + 2] = Math.min(255, raw.data[i + 2] * tint[2]);
  }
  sctx.putImageData(raw, 0, 0);
  const data = raw.data;
  const lum = (x, y) => {
    const i = (((y + h) % h) * w + ((x + w) % w)) * 4;
    return (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
  };
  const out = (fn) => {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const [r, g, b] = fn(x, y);
        const i = (y * w + x) * 4;
        img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL("image/jpeg", 0.92);
  };
  const strength = 0.7;
  const normal = out((x, y) => {
    const dx = (lum(x + 1, y - 1) + 2 * lum(x + 1, y) + lum(x + 1, y + 1) -
      lum(x - 1, y - 1) - 2 * lum(x - 1, y) - lum(x - 1, y + 1)) * strength;
    const dy = (lum(x - 1, y + 1) + 2 * lum(x, y + 1) + lum(x + 1, y + 1) -
      lum(x - 1, y - 1) - 2 * lum(x, y - 1) - lum(x + 1, y - 1)) * strength;
    const inv = 1 / Math.hypot(dx, dy, 1);
    return [(-dx * inv * 0.5 + 0.5) * 255, (-dy * inv * 0.5 + 0.5) * 255, inv * 255];
  });
  const rough = out((x, y) => {
    const v = 255 - lum(x, y) * 120;
    return [v, v, v];
  });
  return { normal, rough };
}, tint);
await browser.close();

const store = async (role, dataUrl) => {
  const buf = Buffer.from(dataUrl.split(",")[1], "base64");
  const file = `public/textures/${id}_${role}.jpg`;
  await writeFile(file, buf);
  return {
    file: `/textures/${id}_${role}.jpg`,
    url: source ?? "scripts/gemini-image.mjs",
    sha256: createHash("sha256").update(buf).digest("hex"),
    bytes: buf.length,
  };
};
// Re-encode the diffuse through the same JPEG path for a consistent contract.
const diffuseJpg = await (async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setContent(`<img id="src" src="${url}">`);
  await p.waitForFunction(() => document.getElementById("src").complete);
  const jpg = await p.evaluate((tint) => {
    const img = document.getElementById("src");
    const c = document.createElement("canvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const raw = ctx.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < raw.data.length; i += 4) {
      raw.data[i] = Math.min(255, raw.data[i] * tint[0]);
      raw.data[i + 1] = Math.min(255, raw.data[i + 1] * tint[1]);
      raw.data[i + 2] = Math.min(255, raw.data[i + 2] * tint[2]);
    }
    ctx.putImageData(raw, 0, 0);
    return c.toDataURL("image/jpeg", 0.92);
  }, tint);
  await b.close();
  return jpg;
})();
const asset = {
  id,
  source: source ?? "Generated",
  license: "Generated",
  maps: {
    diffuse: await store("diffuse", diffuseJpg),
    normal: await store("normal", maps.normal),
    roughness: await store("roughness", maps.rough),
  },
};
console.log(JSON.stringify(asset));
