import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
// Live chase-camera QA screenshots at given world spots.
// Usage: PREVIEW_PORT=5173 node scripts/capture-chase.mjs <level-id> <outdir> <tag> <x,y,z,yaw[,settleMs]>...
// Writes <outdir>/<tag>-<i>.png (1280x720) and prints the paths as JSON.
const PORT = process.env.PREVIEW_PORT ?? "5173";
const [id, outdir, tag, ...spots] = process.argv.slice(2);
if (!id || !outdir || !tag || !spots.length) {
  console.error("Usage: node scripts/capture-chase.mjs <level-id> <outdir> <tag> <x,y,z,yaw[,settleMs]>...");
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
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
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
    window.__game.pause(false);
    window.__game.startTrack(trackId, "easy");
  }, id);
  await page.waitForTimeout(1200);
  for (let i = 0; i < spots.length; i++) {
    const parts = spots[i].split(",").map(Number);
    const [x, y, z, yaw] = parts;
    const settle = parts[4] ?? 1200;
    if (![x, y, z, yaw].every(Number.isFinite)) throw new Error(`bad spot: ${spots[i]}`);
    await page.evaluate(
      ([px, py, pz, pyaw]) => window.__game.place({ x: px, y: py, z: pz }, pyaw),
      [x, y, z, yaw],
    );
    await page.waitForTimeout(settle);
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
