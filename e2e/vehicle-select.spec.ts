import { test, expect } from "@playwright/test";
test("menu offers a vehicle screen that persists the choice", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "Select vehicle" }).click();
  await expect(page.locator("#vehicle-select")).toBeVisible();
  await expect(page.locator(".vehicle-card")).toHaveCount(5);
  const previews = page.locator(".vehicle-preview img");
  await expect(previews).toHaveCount(5);
  for (const image of await previews.all()) {
    await expect(image).toBeVisible();
    await expect
      .poll(() =>
        image.evaluate((node) => {
          const img = node as HTMLImageElement;
          return (
            img.complete &&
            img.naturalWidth === 800 &&
            img.naturalHeight === 450
          );
        }),
      )
      .toBe(true);
  }

  await page.locator('[data-vehicle="monster-truck"] .vehicle-pick').click();
  await expect(page.locator("#vehicle-select")).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem("vehicle"))).toBe(
    "monster-truck",
  );
});
test("official runs start in the selected vehicle", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => {
    localStorage.setItem("vehicle", "monster-truck");
    const g = window.__game!;
    g.pause(true);
    g.startTrack("harbor-sprint");
  });
  expect(await page.evaluate(() => window.__game!.snapshot().vehicleId)).toBe(
    "monster-truck",
  );
  expect(await page.evaluate(() => window.__game!.stats().vehicleId)).toBe(
    "monster-truck",
  );
});
