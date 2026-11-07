import { test, expect } from "@playwright/test";
import { VEHICLES } from "../src/vehicles";
test("menu offers a vehicle screen that persists the choice", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.getByRole("button", { name: "Select vehicle" }).click();
  await expect(page.locator("#vehicle-select")).toBeVisible();
  await expect(page.locator(".vehicle-card")).toHaveCount(VEHICLES.length);
  const previews = page.locator(".vehicle-preview img");
  await expect(previews).toHaveCount(VEHICLES.length);
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

  await page.getByRole("button", { name: "Drive the Jack-o-Racer" }).click();
  await expect(page.locator("#vehicle-select")).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem("vehicle"))).toBe(
    "jack-o-racer",
  );
});
test("official runs start in the selected vehicle", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => {
    localStorage.setItem("vehicle", "orbital-rover");
    const g = window.__game!;
    g.pause(true);
    g.startTrack("harbor-sprint");
  });
  expect(await page.evaluate(() => window.__game!.snapshot().vehicleId)).toBe(
    "orbital-rover",
  );
  expect(await page.evaluate(() => window.__game!.stats().vehicleId)).toBe(
    "orbital-rover",
  );
});
