import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
// Level-select thumbnails: real in-game screenshots, one per official level.
// Usage: PREVIEW_PORT=5199 node scripts/capture-level-previews.mjs [id...]
// IDs default to the full official lineup, read live from the level-select
// screen; pass a subset to recapture. Each level uses the next vehicle in
// garage order (triple-loop -> Monster Truck, harbor-sprint -> Sports Car,
// ...), and the chase camera is zoomed out through the real wheel path to
// the player's max zoom-out distance (45) before each screenshot.
const PORT = process.env.PREVIEW_PORT ?? "5173";
const MAX_ZOOM_DISTANCE = 45;
const browser = await chromium.launch({
  args: [
    "--enable-webgl",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const file = (id) => id.replace(/^custom:/, "");
/** Zoom the chase camera out through the real player wheel path. */
async function zoomToMax(page) {
  await page.mouse.move(400, 225);
  for (let i = 0; i < 6; i++) {
    const distance = await page.evaluate(
      () => window.__game.camera().distance,
    );
    if (distance >= MAX_ZOOM_DISTANCE - 0.1) return distance;
    await page.mouse.wheel(0, 800);
  }
  // Headless fallback: same listener, synthetic event.
  await page.evaluate(() => {
    document
      .querySelector("#viewport canvas")
      .dispatchEvent(new WheelEvent("wheel", { deltaY: 2000, bubbles: true }));
  });
  const distance = await page.evaluate(
    () => window.__game.camera().distance,
  );
  if (distance < MAX_ZOOM_DISTANCE - 0.1)
    throw new Error(`Zoom-out failed: distance ${distance}`);
  return distance;
}
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
  await page.waitForFunction(
    () =>
      document.querySelectorAll("#level-select [data-track]").length > 0,
  );
  const lineup = await page
    .locator("#level-select [data-track]")
    .evaluateAll((cards) =>
      cards.map((card) => ({
        id: card.dataset.track,
        img: card.querySelector("img")?.getAttribute("src") ?? null,
      })),
    );
  const vehicles = await page
    .locator("#vehicle-select [data-vehicle]")
    .evaluateAll((cards) => cards.map((card) => card.dataset.vehicle));
  if (!vehicles.length) throw new Error("No vehicles found in garage");
  const wanted = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const indexOf = (id) => {
    const at = lineup.findIndex((t) => t.id === id);
    if (at >= 0) return at;
    return lineup.findIndex((t) => t.id === `custom:${id}`);
  };
  const queue = wanted.length ? wanted : lineup.map((t) => t.id);
  await page.addStyleTag({
    content:
      "#app > :not(#viewport) { visibility: hidden !important; } #viewport { inset: 0 !important; }",
  });
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  await page.waitForTimeout(500);
  await mkdir("public/tracks", { recursive: true });
  for (const id of queue) {
    const at = indexOf(id);
    if (at < 0) throw new Error(`Unknown official level: ${id}`);
    const trackId = lineup[at].id;
    const vehicle = vehicles[at % vehicles.length];
    await page.evaluate(
      ({ trackId, vehicle }) => {
        window.__captureFreeze = false;
        window.__game.pause(false);
        window.__game.startTrack(trackId, "easy", vehicle);
        window.__game.advanceFrames(90, 1, {});
      },
      { trackId, vehicle },
    );
    await page.waitForTimeout(2000);
    const distance = await zoomToMax(page);
    await page.evaluate(() => {
      window.__game.pause(true);
      window.__captureFreeze = true;
      window.__game.advanceFrames(2, 1, {});
    });
    const img = lineup[at].img;
    const out =
      img?.startsWith("/tracks/") && img.endsWith(".png")
        ? `public${img}`
        : `public/tracks/${file(trackId)}.png`;
    await page.locator("#viewport canvas").screenshot({ path: out });
    const bytes = await readFile(out);
    const w = bytes.readUInt32BE(16),
      h = bytes.readUInt32BE(20);
    if (w < 640 || h < 360) throw new Error(`${out} too small: ${w}x${h}`);
    console.log(
      `Captured ${trackId} with ${vehicle} @ distance ${distance.toFixed(1)} ${w}x${h}`,
    );
  }
} finally {
  await browser.close();
}
