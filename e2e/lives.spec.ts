import { test, expect } from "@playwright/test";

test.slow();

test("a spent life respawns at spawn with full integrity and a banner", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("iron-flight-settings-v1", JSON.stringify({ video: "low", lives: 3 }));
  });
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => window.__game!.startTrack("foundry-run"));
  await page.evaluate(() => window.__game!.damage("chassis-front", 10000));
  await page.evaluate(() => window.__game!.advanceFrames(5, 1, {}));
  const run = await page.evaluate(() => window.__game!.snapshot().run!);
  expect(run.status).toBe("running");
  expect(run.lives).toBe(2);
  const track = await page.evaluate(() => window.__game!.track("foundry-run"));
  const at = await page.evaluate(() => window.__game!.snapshot().position);
  expect(at.x).toBeCloseTo(track.spawn.x, 0);
  expect(at.z).toBeCloseTo(track.spawn.z, 0);
  await expect(page.locator("#hud-lives")).toHaveText("2");
  await expect(page.locator("#integrity")).toHaveText("100%");
  await expect(page.locator("#checkpoint-banner")).toBeVisible();
  await expect(page.locator("#checkpoint-banner strong")).toHaveText("LIFE LOST!");
});

test("a single life still ends the run on the first wreck", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("iron-flight-settings-v1", JSON.stringify({ video: "low", lives: 1 }));
  });
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => window.__game!.startTrack("foundry-run"));
  await page.evaluate(() => window.__game!.damage("chassis-front", 10000));
  await page.evaluate(() => window.__game!.advanceFrames(5, 1, {}));
  const run = await page.evaluate(() => window.__game!.snapshot().run!);
  expect(run.status).toBe("failed");
  expect(run.reason).toBe("wrecked");
  expect(run.lives).toBe(1);
});
