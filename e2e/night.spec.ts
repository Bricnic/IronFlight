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


test("night toggle drives the headlight rig", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  const headlights = () =>
    page.evaluate(() => window.__game!.stats().headlights.on);
  await expect.poll(headlights, { timeout: 15000 }).toBe(false);
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator('[data-weather="night"] button').click();
  await page.locator("#settings-back").click();
  await expect.poll(headlights, { timeout: 15000 }).toBe(true);
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator('[data-weather="night"] button').click();
  await page.locator("#settings-back").click();
  await expect.poll(headlights, { timeout: 15000 }).toBe(false);
});

test("night lights checkpoint gates and lamp posts", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  const glow = () =>
    page.evaluate(() => {
      const course = window.__game!.stats().officialCourse;
      return { gateGlow: course.gateGlow, lampGlow: course.lampGlow };
    });
  await page.evaluate(() => window.__game!.startTrack("harbor-sprint"));
  await expect.poll(glow, { timeout: 30000 }).toMatchObject({ gateGlow: 0, lampGlow: 0 });
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator('[data-weather="night"] button').click();
  await page.locator("#settings-back").click();
  await expect
    .poll(glow, { timeout: 30000 })
    .toMatchObject({ gateGlow: expect.any(Number), lampGlow: expect.any(Number) });
  const lit = await glow();
  expect(lit.gateGlow).toBeGreaterThan(0);
  await page.evaluate(() => window.__game!.startTrack("custom:pumpkin-pass"));
  await expect
    .poll(() => glow().then((g) => g.lampGlow), { timeout: 30000 })
    .toBeGreaterThan(0);
});
test("night lights the nearest dungeon candles", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => window.__game!.startTrack("custom:dungeon"));
  const candles = () =>
    page.evaluate(() => window.__game!.stats().candleLights);
  await expect.poll(candles, { timeout: 30000 }).toMatchObject({ active: 0, total: 8 });
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator('[data-weather="night"] button').click();
  await page.locator("#settings-back").click();
  await expect.poll(() => candles().then((c) => c.active), { timeout: 30000 }).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator('[data-weather="night"] button').click();
  await page.locator("#settings-back").click();
  await expect.poll(() => candles().then((c) => c.active), { timeout: 30000 }).toBe(0);
});
