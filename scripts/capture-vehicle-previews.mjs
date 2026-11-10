import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
// Showroom-zoom onboarding gate: the headless tests/new-vehicles.test.ts
// "frames a consistent showroom zoom" proof guards the vehicle-side framing
// math; this is its browser-side twin. After framing each preview we read
// back the real camera<->truck distance and retry a glitched capture
// instead of silently committing a wrong-zoom PNG (the historical
// hearse/fuel-tanker/golf-cart previews implied ~25m; healthy is 8-13m).
const ZOOM_MIN = 7;
const ZOOM_MAX = 14;
const ATTEMPTS = 3;
async function capturePose(page, id) {
  await page.evaluate((vid) => {
    const g = window.__game;
    g.startTrack("harbor-sprint", "easy", vid);
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
  return page.evaluate(() => {
    const g = window.__game;
    const cam = g.camera().position;
    const snap = g.snapshot();
    const truck = snap.p ?? snap.position;
    return {
      distance: Math.hypot(
        cam.x - truck.x,
        cam.y - truck.y,
        cam.z - truck.z,
      ),
    };
  });
}
const browser = await chromium.launch({
  args: [
    "--enable-webgl",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const requested = process.argv.slice(2);
let failed = null;
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
    let distance = NaN;
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      distance = (await capturePose(page, id)).distance;
      if (distance >= ZOOM_MIN && distance <= ZOOM_MAX) break;
      console.log(
        `Zoom ${distance.toFixed(2)}m out of band [${ZOOM_MIN}, ${ZOOM_MAX}] for ${id} (attempt ${attempt}/${ATTEMPTS}), retrying`,
      );
    }
    if (!(distance >= ZOOM_MIN && distance <= ZOOM_MAX)) {
      failed = `${id}: showroom zoom ${distance.toFixed(2)}m outside [${ZOOM_MIN}, ${ZOOM_MAX}] after ${ATTEMPTS} attempts`;
      break;
    }
    await page
      .locator("#viewport canvas")
      .screenshot({ path: `public/vehicles/${id}.png` });
    console.log(`Captured ${id} (zoom ${distance.toFixed(2)}m)`);
  }
} finally {
  await browser.close();
}
if (failed) {
  console.error(`capture-vehicle-previews: FAILED: ${failed}`);
  process.exit(1);
}
