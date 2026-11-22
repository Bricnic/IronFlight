import { test, expect } from "@playwright/test";
import { blankLevel } from "../src/custom-level";

test("broken plank shards fall visibly and disappear into lava", async ({ page }, info) => {
  test.slow();
  await page.route("**/__levels", async route => {
    if (route.request().method() === "POST") await route.fulfill({ json: route.request().postDataJSON().level });
    else await route.continue();
  });
  await page.goto("/"); await page.waitForFunction(() => !!window.__game);
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") }); await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  const level = blankLevel("e2e-rickety-debris");
  level.spawn = { x: 0, y: 10.1, z: 0, yaw: 0 };
  level.prefabs = [{ id: "plank", kind: "rickety-plank", x: 0, y: 8, z: 0 }];
  level.solids = [
    { id: "lava", kind: "lava", x: 0, y: -4, z: 0, w: 40, h: 0.2, d: 40, color: 0xff5500 },
    { id: "safe", kind: "ground", x: -40, y: -0.5, z: 0, w: 20, h: 1, d: 20, color: 0x777777 },
  ];
  const initial = await page.evaluate(async level => {
    const g = window.__game!; await g.customLevels.save(level); g.startTrack("custom:e2e-rickety-debris"); g.pause(true);
    for (let i = 0; i < 240 && !g.snapshot().fragileIce[0].shattered; i++) g.driveFrames(1, 1, () => ({}), false);
    g.place({ x: -40, y: 2.1, z: 0 }, 0);
    return g.snapshot().fragileIce[0];
  }, level);
  expect(initial.shattered).toBe(true); expect(initial.shards).toHaveLength(6);
  await page.evaluate(() => { const g = window.__game!; g.advanceFrames(18, 1, {}); g.frameSpot(0, 6, 0, 18, 0.6, 0.4); });
  const falling = await page.evaluate(() => window.__game!.snapshot().fragileIce[0]);
  expect(falling.shards![0].y).toBeLessThan(initial.shards![0].y);
  await page.screenshot({ path: info.outputPath("rickety-shards-falling.png") });
  await page.evaluate(() => { const g = window.__game!; g.advanceFrames(180, 1, {}); g.frameSpot(0, 0, 0, 20, 0.6, 0.4); });
  expect((await page.evaluate(() => window.__game!.snapshot().fragileIce[0])).shards).toHaveLength(0);
  await page.screenshot({ path: info.outputPath("rickety-shards-cleared-by-lava.png") });
});
