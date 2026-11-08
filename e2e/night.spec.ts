import { test, expect } from "@playwright/test";

test("night toggle switches the sky rig and star field", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  const background = () =>
    page.evaluate(() => window.__game!.stats().background);
  await expect
    .poll(background, { timeout: 15000 })
    .toMatchObject({ night: false, stars: 0 });
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator('[data-weather="night"] button').click();
  await page.locator("#settings-back").click();
  await expect
    .poll(background, { timeout: 15000 })
    .toMatchObject({ night: true, stars: 300 });
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator('[data-weather="night"] button').click();
  await page.locator("#settings-back").click();
  await expect
    .poll(background, { timeout: 15000 })
    .toMatchObject({ night: false, stars: 0 });
});
