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
const requested = process.argv.slice(2);
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
  const baseUrl = process.env.CAPTURE_URL ?? "http://127.0.0.1:5173";
  await page.goto(`${baseUrl}/?test=vehicle-previews`);
  await page.waitForFunction(() => !!window.__game);
  const ids = requested.length
    ? requested
    : await page
        .locator("#vehicle-select [data-vehicle]")
        .evaluateAll((cards) => cards.map((card) => card.dataset.vehicle));
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
    }, id);
    await page.waitForFunction(
      () =>
        window.__game
          .inspectSolids()
          .every(
            ({ map, normalMap, roughnessMap }) =>
              ![map, normalMap, roughnessMap].includes("pending"),
          ),
      null,
      { polling: 100 },
    );
    await page.evaluate(() => window.__game.vehiclePreview());
    await page
      .locator("#viewport canvas")
      .screenshot({ path: `public/vehicles/${id}.png` });
    console.log(`Captured ${id}`);
  }
} finally {
  await browser.close();
}
