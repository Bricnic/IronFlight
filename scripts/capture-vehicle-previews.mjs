import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({
  args: [
    "--enable-webgl",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const ids = [
  "monster-truck",
  "sports-car",
  "cop-car",
  "ambulance",
  "school-bus",
];
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
  await page.goto("http://127.0.0.1:5173/?test=vehicle-previews");
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
  for (const id of ids) {
    await page.evaluate((id) => {
      const g = window.__game;
      g.startTrack("harbor-sprint", "easy", id);
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
