import { test, expect } from "@playwright/test";

test.slow();

test("N and P step through levels with wraparound", async ({ page }) => {
  test.setTimeout(420000);
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
  for (const id of ["custom:fairground", "custom:dungeon", "custom:jurassic-junction", "custom:emberfall-causeway", "custom:chompworks", "custom:machine-gauntlet", "custom:amber-undertow", "custom:fireside-sonata", "custom:pumpkin-pass", "custom:booster-gap", "custom:evil-tube-run", "triple-loop", "harbor-sprint"]) {
    await page.keyboard.press("n");
    await expect.poll(trackId, { timeout: 15000 }).toBe(id);
  }
  for (const id of ["triple-loop", "custom:evil-tube-run", "custom:booster-gap", "custom:pumpkin-pass", "custom:fireside-sonata", "custom:amber-undertow", "custom:machine-gauntlet", "custom:chompworks", "custom:emberfall-causeway", "custom:jurassic-junction", "custom:dungeon", "custom:fairground", "sky-slide"]) {
    await page.keyboard.press("p");
    await expect.poll(trackId, { timeout: 15000 }).toBe(id);
  }
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

test("L returns to level select from an active run", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => {
    const g = window.__game!;
    g.pause(true);
    g.startTrack("harbor-sprint");
  });
  await expect(page.locator("#level-select")).toBeHidden();
  await page.keyboard.press("l");
  await expect(page.locator("#level-select")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Choose your track.", exact: true }),
  ).toBeVisible();
});
