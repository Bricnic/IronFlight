import { test, expect } from "@playwright/test";

test.setTimeout(240000);

test("rain toggle switches the streak field", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  const background = () =>
    page.evaluate(() => window.__game!.stats().background);
  await expect
    .poll(background, { timeout: 15000 })
    .toMatchObject({ rain: false, rainStreaks: 0 });
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator('[data-weather="rain"] button').click();
  await page.locator("#settings-back").click();
  await expect
    .poll(background, { timeout: 15000 })
    .toMatchObject({ rain: true, rainStreaks: 900 });
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator('[data-weather="rain"] button').click();
  await page.locator("#settings-back").click();
  await expect
    .poll(background, { timeout: 15000 })
    .toMatchObject({ rain: false, rainStreaks: 0 });
});
test("rain glosses fairground roads and ground", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => window.__game!.startTrack("custom:fairground"));
  const gloss = () =>
    page.evaluate(() => window.__game!.stats().officialCourse.wetGloss);
  await expect.poll(gloss, { timeout: 30000 }).toBe(0);
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator('[data-weather="rain"] button').click();
  await page.locator("#settings-back").click();
  await expect.poll(gloss, { timeout: 30000 }).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator('[data-weather="rain"] button').click();
  await page.locator("#settings-back").click();
  await expect.poll(gloss, { timeout: 30000 }).toBe(0);
});
