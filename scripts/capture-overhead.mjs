import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
// Top-down QA screenshots at given world spots, for z-fighting inspection.
// Usage: PREVIEW_PORT=5173 node scripts/capture-overhead.mjs <level-id> <outdir> <tag> <x,z[,height]>...
// Writes <outdir>/<tag>-<i>.png (800x450) and prints the paths as JSON.
const PORT = process.env.PREVIEW_PORT ?? "5173";
const [id, outdir, tag, ...spots] = process.argv.slice(2);
if (!id || !outdir || !tag || !spots.length) {
  console.error("Usage: node scripts/capture-overhead.mjs <level-id> <outdir> <tag> <x,z[,height]>...");
  process.exit(2);
}
const browser = await chromium.launch({
  args: [
    "--enable-webgl",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const paths = [];
try {
  const page = await browser.newPage({
    viewport: { width: 800, height: 450 },
    deviceScaleFactor: 1,
  });
  await page.addInitScript(() => {
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) =>
      raf((t) => {
        if (!window.__captureFreeze) cb(t);
      });
  });
  await page.goto(`http://127.0.0.1:${PORT}/`);
  await page.waitForFunction(() => !!window.__game);
  await page.waitForFunction(
    (want) => {
      try {
        return !!window.__game.track(want);
      } catch {
        return false;
      }
    },
    id,
    { timeout: 30000 },
  );
  await page.addStyleTag({
    content:
      "#app > :not(#viewport) { visibility: hidden !important; } #viewport { inset: 0 !important; }",
  });
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  await page.waitForTimeout(500);
  await mkdir(outdir, { recursive: true });
  await page.evaluate((trackId) => {
    window.__captureFreeze = false;
    window.__game.pause(false);
    window.__game.startTrack(trackId, "easy");
    window.__game.advanceFrames(90, 1, {});
  }, id);
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    window.__game.pause(true);
    window.__captureFreeze = true;
    window.__game.advanceFrames(2, 1, {});
  });
  for (let i = 0; i < spots.length; i++) {
    const [x, z, h] = spots[i].split(",").map(Number);
    if (!Number.isFinite(x) || !Number.isFinite(z)) throw new Error(`bad spot: ${spots[i]}`);
    await page.evaluate(([sx, sz, sh]) => window.__game.overhead(sx, sz, sh ?? 150), [x, z, h]);
    await page.waitForTimeout(400);
    const out = `${outdir}/${tag}-${i}.png`;
    await page.locator("#viewport canvas").screenshot({ path: out });
    const bytes = await readFile(out);
    const w = bytes.readUInt32BE(16), hh = bytes.readUInt32BE(20);
    if (w < 640 || hh < 360) throw new Error(`${out} too small: ${w}x${hh}`);
    paths.push(out);
  }
  console.log(JSON.stringify({ shots: paths }));
} finally {
  await browser.close();
}
