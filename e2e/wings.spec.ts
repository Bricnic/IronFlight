import { test, expect } from "@playwright/test";
import type { CustomLevel } from "../src/custom-level";

test.slow();

const LEVEL: CustomLevel = {
  name: "e2e-wings",
  mode: "race",
  spawn: { x: 0, y: 2, z: -60, yaw: 0 },
  checkpoints: [{ x: 0, z: 120 }],
  solids: [
    {
      id: "ground-1",
      kind: "ground",
      x: 0,
      y: -0.5,
      z: 0,
      w: 30,
      h: 1,
      d: 140,
      color: 0x303e49,
      texture: "asphalt_02",
    },
    {
      id: "kicker",
      kind: "ramp",
      x: 0,
      y: 0.5,
      z: 30,
      w: 12,
      h: 1,
      d: 14,
      angle: -0.35,
      color: 0xe6b655,
    },
    {
      id: "ground-2",
      kind: "ground",
      x: 0,
      y: -0.5,
      z: 120,
      w: 30,
      h: 1,
      d: 120,
      color: 0x303e49,
      texture: "asphalt_02",
    },
  ],
  prefabs: [{ id: "wings-1", kind: "wings", x: 0, y: 2, z: 0 }],
  medals: { gold: 30, silver: 45, bronze: 60 },
};

test("wings equip on collect and fly off a ramp with a live badge", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(async (level) => {
    const g = window.__game!;
    await g.customLevels.remove(level.name).catch(() => {});
    await g.customLevels.save(level);
    g.pause(true);
    g.startTrack("custom:e2e-wings");
  }, LEVEL);
  try {
    await expect(page.locator("#wings-badge")).toBeHidden();
    // Drive through the wings pickup.
    const equipped = await page.evaluate(() => {
      const g = window.__game!;
      for (let f = 0; f < 900 && !g.snapshot().run?.wings; f++)
        g.driveFrames(1, 1, () => ({ throttle: 1, steer: 0 }), false);
      return !!g.snapshot().run?.wings;
    });
    expect(equipped).toBe(true);
    await expect(page.locator("#wings-badge")).toBeVisible();
    await expect(page.locator("#wings-badge")).toHaveText("WINGS");
    // Launch off the kicker and fly with throttle.
    const flew = await page.evaluate(() => {
      const g = window.__game!;
      let seen = false;
      for (let f = 0; f < 900 && !seen; f++) {
        g.driveFrames(1, 1, () => ({ throttle: 1, steer: 0 }), false);
        seen = g.snapshot().flying;
      }
      return seen;
    });
    expect(flew).toBe(true);
    await expect(page.locator("#wings-badge")).toHaveText("FLYING");
    await page.screenshot({ path: "artifacts/wings-flight.png" });
    // Coast down: drag settles below 20mph into the slow sink.
    await page.evaluate(() => {
      const g = window.__game!;
      for (let f = 0; f < 1200 && g.snapshot().flying; f++)
        g.driveFrames(
          1,
          1,
          () => ({ throttle: 0, steer: 0 }),
          false,
        );
    });
    await expect(page.locator("#wings-badge")).toHaveText("WINGS");
    expect(
      await page.evaluate(() => window.__game!.snapshot().run?.wings),
    ).toBe(true);
  } finally {
    await page.evaluate((name) =>
      window.__game!.customLevels.remove(name).catch(() => {}),
      LEVEL.name,
    );
  }
});
