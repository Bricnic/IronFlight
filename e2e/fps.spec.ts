import { test, expect, type Page } from "@playwright/test";

test.slow();

const TRACKS = [
  "triple-loop",
  "harbor-sprint",
  "foundry-run",
  "skyline-circuit",
  "scrapyard-sweep",
  "inferno-vault",
  "canyon-plunge",
  "haunted-hollow",
  "sky-slide",
];

async function measureFps(page: Page, seconds: number): Promise<number> {
  return page.evaluate(
    (ms) =>
      new Promise<number>((resolve) => {
        let frames = 0;
        const t0 = performance.now();
        const tick = () => {
          frames++;
          if (performance.now() - t0 < ms) requestAnimationFrame(tick);
          else resolve((frames * 1000) / (performance.now() - t0));
        };
        requestAnimationFrame(tick);
      }),
    seconds * 1000,
  );
}

test("every level sustains 60 fps on low video", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "iron-flight-settings-v1",
      JSON.stringify({ video: "low" }),
    );
  });
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  expect(await page.evaluate(() => window.__game!.stats().video.tier)).toBe(
    "low",
  );
  // Median of three windows: healthy levels read the 60Hz vsync cap, real
  // shortfalls (haunted read 56.1-56.4 three runs straight) sit well below
  // the bar, and one noisy window cannot fail the gate.
  const results: { track: string; fps: number }[] = [];
  for (const track of TRACKS) {
    await page.evaluate((id) => {
      const g = window.__game!;
      g.pause(true);
      g.startTrack(id as never);
      g.pause(false);
    }, track);
    await page.keyboard.down("w");
    await measureFps(page, 1.5);
    const windows = [
      await measureFps(page, 2),
      await measureFps(page, 2),
      await measureFps(page, 2),
    ];
    await page.keyboard.up("w");
    const fps = windows.sort((a, b) => a - b)[1];
    results.push({ track, fps });
    console.log(
      `FPS ${track}: median=${fps.toFixed(1)} windows=${windows.map((w) => w.toFixed(1)).join("/")}`,
    );
  }
  for (const { track, fps } of results)
    expect(fps, `${track} holds 60fps on low`).toBeGreaterThanOrEqual(58);
});
