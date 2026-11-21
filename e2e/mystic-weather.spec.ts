import { test, expect } from "@playwright/test";

test("leaving a mystic track restores Settings weather", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  const weather = () => page.evaluate(() => window.__game!.stats().weather);
  const template = () => page.evaluate(() => window.__game!.stats().background.template);
  // Fresh profile: daytime Settings.
  await expect.poll(weather, { timeout: 15000 }).toEqual({ night: false, rain: false });
  // Lavabridge Abyss forces permanent night (spooky places, direct start).
  await page.evaluate(() => window.__game!.startTrack("custom:lavabridge-abyss", "easy"));
  await expect.poll(weather, { timeout: 15000 }).toEqual({ night: true, rain: false });
  await expect.poll(template, { timeout: 15000 }).toBe("mystic-cave");
  await expect(page.locator("#weather-night")).toBeVisible();
  // N steps to the first unlocked track and restores daytime Settings.
  await page.keyboard.press("n");
  await expect.poll(weather, { timeout: 15000 }).toEqual({ night: false, rain: false });
  await expect(page.locator("#weather-night")).toBeHidden();
  await expect.poll(template, { timeout: 15000 }).not.toBe("mystic-cave");
  // P steps elsewhere unlocked and stays daytime.
  await page.keyboard.press("p");
  await expect.poll(weather, { timeout: 15000 }).toEqual({ night: false, rain: false });
  await expect(page.locator("#weather-night")).toBeHidden();
  // Returning to the abyss returns to permanent night.
  await page.evaluate(() => window.__game!.startTrack("custom:lavabridge-abyss", "easy"));
  await expect.poll(weather, { timeout: 15000 }).toEqual({ night: true, rain: false });
  await expect.poll(template, { timeout: 15000 }).toBe("mystic-cave");
  await expect(page.locator("#weather-night")).toBeVisible();
  // Exiting to the menu clears the temporary night badge.
  await page.keyboard.press("l");
  await expect.poll(weather, { timeout: 15000 }).toEqual({ night: false, rain: false });
  await expect(page.locator("#weather-night")).toBeHidden();
});
