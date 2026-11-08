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
