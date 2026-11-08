import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
// Level-select thumbnails: real in-game screenshots, one per official level.
// Usage: PREVIEW_PORT=5199 node scripts/capture-level-previews.mjs [id...]
// IDs default to the full official lineup; pass a subset to recapture.
const PORT = process.env.PREVIEW_PORT ?? "5173";
const browser = await chromium.launch({
  args: [
    "--enable-webgl",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const allLevels = [
  "triple-loop",
  "harbor-sprint",
  "foundry-run",
  "skyline-circuit",
  "scrapyard-sweep",
  "inferno-vault",
  "canyon-plunge",
  "haunted-hollow",
  "sky-slide",
  "custom:fairground",
  "custom:dungeon",
  "custom:jurassic-junction",
];
const levels = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const queue = levels.length ? levels : allLevels;
const file = (id) => id.replace(/^custom:/, "");
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
  await page.waitForFunction(() => {
    try {
      return !!window.__game.track("custom:dungeon");
    } catch {
      return false;
    }
  });
  await page.addStyleTag({
    content:
      "#app > :not(#viewport) { visibility: hidden !important; } #viewport { inset: 0 !important; }",
  });
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  await page.waitForTimeout(500);
  await mkdir("public/tracks", { recursive: true });
  for (const id of queue) {
    await page.evaluate((id) => {
      window.__captureFreeze = false;
      window.__game.pause(false);
      window.__game.startTrack(id, "easy");
      window.__game.advanceFrames(90, 1, {});
    }, id);
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      window.__game.pause(true);
      window.__captureFreeze = true;
      window.__game.advanceFrames(2, 1, {});
    });
    const out = `public/tracks/${file(id)}.png`;
    await page.locator("#viewport canvas").screenshot({ path: out });
    const bytes = await readFile(out);
    const w = bytes.readUInt32BE(16),
      h = bytes.readUInt32BE(20);
    if (w < 640 || h < 360) throw new Error(`${out} too small: ${w}x${h}`);
    console.log(`Captured ${id} ${w}x${h}`);
  }
} finally {
  await browser.close();
}
