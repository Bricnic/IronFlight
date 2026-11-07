import { test, expect } from "@playwright/test";

test.slow();

test("N and P step through levels with wraparound", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  const trackId = () =>
    page.evaluate(() => window.__game!.snapshot().run?.trackId);
  await page.evaluate(() => {
    const g = window.__game!;
    g.pause(true);
    g.startTrack("harbor-sprint");
  });
  await expect.poll(trackId, { timeout: 15000 }).toBe("harbor-sprint");
  await page.keyboard.press("n");
  await expect.poll(trackId, { timeout: 15000 }).toBe("foundry-run");
  await page.keyboard.press("p");
  await expect.poll(trackId, { timeout: 15000 }).toBe("harbor-sprint");
  await page.evaluate(() => {
    window.__game!.startTrack("sky-slide");
  });
  await expect.poll(trackId, { timeout: 15000 }).toBe("sky-slide");
  await page.keyboard.press("n");
  await expect.poll(trackId, { timeout: 15000 }).toBe("custom:fairground");
  await page.keyboard.press("n");
  await expect.poll(trackId, { timeout: 15000 }).toBe("triple-loop");
  await page.keyboard.press("p");
  await expect.poll(trackId, { timeout: 15000 }).toBe("custom:fairground");
  await page.keyboard.press("p");
  await expect.poll(trackId, { timeout: 15000 }).toBe("sky-slide");
});

test("C opens the vehicle select screen", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.keyboard.press("c");
  await expect(
    page.getByRole("heading", { name: "Choose your vehicle.", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("l");
  await expect(
    page.getByRole("heading", { name: "Choose your track.", exact: true }),
  ).toBeVisible();
});

