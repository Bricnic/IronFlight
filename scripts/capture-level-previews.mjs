import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
// Level-select thumbnails: real in-game screenshots, one per official level.
// Usage: PREVIEW_PORT=5199 node scripts/capture-level-previews.mjs
const PORT = process.env.PREVIEW_PORT ?? "5173";
const browser = await chromium.launch({
  args: [
    "--enable-webgl",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const levels = [
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
];
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
  await mkdir("public/tracks", { recursive: true });
  for (const id of levels) {
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
    await page
      .locator("#viewport canvas")
      .screenshot({ path: `public/tracks/${file(id)}.png` });
    console.log(`Captured ${id}`);
  }
} finally {
  await browser.close();
}
