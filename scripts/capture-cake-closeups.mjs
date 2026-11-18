import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
// Cake close-ups for the Stage 1 reviewer: angled + top-down shots of both
// birthday cake centerpieces, frozen mid-render like capture-overhead.mjs.
// Usage: PREVIEW_PORT=5199 node scripts/capture-cake-closeups.mjs
// Writes visual-plan/review/cake-<tag>.png (1280x720).
const PORT = process.env.PREVIEW_PORT ?? "5173";
const SHOTS = [
  // [levelId, tag, mode, args]
  ["custom:birthday-cake-circuit", "grand-34", "frame", [0, 16, 0, 185, 0.6, 0.42]],
  ["custom:birthday-cake-circuit", "grand-top", "overhead", [0, 0, 165]],
  ["custom:birthday-cake-circuit", "grand-drip", "frame", [52, 11, 8, 42, 0.4, 0.32]],
  ["custom:birthday-cake-circuit", "grand-cherry", "frame", [0, 34, 0, 60, 2.2, 0.3]],
  ["custom:birthday-table-loop", "table-34", "frame", [0, 9, 0, 135, 2.4, 0.42]],
  ["custom:birthday-table-loop", "table-top", "overhead", [0, 0, 120]],
  ["custom:birthday-table-loop", "table-drip", "frame", [36, 9, 6, 38, 0.4, 0.32]],
  ["custom:birthday-table-loop", "table-cherry", "frame", [0, 20, 0, 55, 2.2, 0.3]],
];
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
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });
  page.setDefaultTimeout(120000);
  await page.addInitScript(() => {
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) =>
      raf((t) => {
        if (!window.__captureFreeze) cb(t);
      });
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${PORT}/`);
  await page.waitForFunction(() => !!window.__game);
  await page.addStyleTag({
    content:
      "#app > :not(#viewport) { visibility: hidden !important; } #viewport { inset: 0 !important; }",
  });
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  await page.waitForTimeout(500);
  await mkdir("visual-plan/review", { recursive: true });
  let current = "";
  for (const [id, tag, mode, args] of SHOTS) {
    if (id !== current) {
      current = id;
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
    }
    await page.evaluate(
      ([m, a]) =>
        m === "frame"
          ? window.__game.frameSpot(...a)
          : window.__game.overhead(...a),
      [mode, args],
    );
    await page.waitForTimeout(600);
    const out = `visual-plan/review/cake-${tag}.png`;
    await page.locator("#viewport").screenshot({ path: out });
    console.log(`Captured ${out}`);
  }
  if (errors.length) {
    console.error(`Page errors:\n${errors.join("\n")}`);
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
