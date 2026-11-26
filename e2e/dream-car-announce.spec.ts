import { test, expect } from "@playwright/test";

test.slow();

test("dream announces its car when the star completes gold plus star", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  // Preseed the dream gold (1s beats the threshold); star still missing.
  await page.evaluate(() => {
    localStorage.setItem(
      "iron-flight-best-times-v1",
      JSON.stringify({
        version: 1,
        records: { "custom:sweet-celebrations-dream:default": { time: 1, splits: [] } },
      }),
    );
  });
  await page.reload();
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => {
    window.__game!.startTrack("custom:sweet-celebrations-dream", "easy");
  });
  // Let hud snapshot the pre-star state, then bank the star and freeze.
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const g = window.__game!;
    g.place({ x: -100.12, y: 44.44, z: 381.17 }, 0);
    g.advanceFrames(3, 1, {});
    g.pause(true);
  });
  const banner = page.locator("#checkpoint-banner");
  await expect(banner.locator("strong")).toHaveText("DREAM CAR UNLOCKED!");
  await expect(page.locator("#checkpoint-delta")).toHaveText("Cake Cruiser");
});
