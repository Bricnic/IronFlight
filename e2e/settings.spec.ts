import { test, expect } from "@playwright/test";

test.slow();

test("settings page toggles video quality live", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  const video = () => page.evaluate(() => window.__game!.stats().video);
  await expect.poll(video, { timeout: 15000 }).toMatchObject({
    tier: "high",
    pixelRatio: 1,
    shadows: true,
    far: 650,
    fogScale: 1,
  });
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.locator("#settings-screen")).toBeVisible();
  await page.locator('[data-video="low"] button').click();
  await expect.poll(video, { timeout: 15000 }).toMatchObject({
    tier: "low",
    pixelRatio: 0.75,
    shadows: false,
    far: 350,
    fogScale: 0.6,
  });
  await page.locator('[data-video="medium"] button').click();
  await expect.poll(video, { timeout: 15000 }).toMatchObject({
    tier: "medium",
    pixelRatio: 1,
    shadows: true,
    far: 500,
    fogScale: 0.8,
  });
  await page.locator('[data-video="high"] button').click();
  await expect.poll(video, { timeout: 15000 }).toMatchObject({
    tier: "high",
    shadows: true,
    far: 650,
    fogScale: 1,
  });
  const stored = await page.evaluate(() =>
    localStorage.getItem("iron-flight-settings-v1"),
  );
  expect(JSON.parse(stored!)).toEqual({ video: "high" });
  await page.locator("#settings-back").click();
  await expect(page.locator("#settings-screen")).toBeHidden();
});

test("video tier persists across reload", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator('[data-video="low"] button').click();
  await expect
    .poll(() => page.evaluate(() => window.__game!.stats().video.tier), {
      timeout: 15000,
    })
    .toBe("low");
  await page.reload();
  await page.waitForFunction(() => !!window.__game);
  await expect
    .poll(() => page.evaluate(() => window.__game!.stats().video), {
      timeout: 15000,
    })
    .toMatchObject({ tier: "low", shadows: false, far: 350 });
});
