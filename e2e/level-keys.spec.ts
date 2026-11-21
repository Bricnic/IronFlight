import { test, expect } from "@playwright/test";

test.slow();

test("N and P step through unlocked levels in collection order", async ({ page }) => {
  // 30 level switches across the 14 unlocked tracks (2 per collection).
  test.setTimeout(960000);
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  const trackId = () =>
    page.evaluate(() => window.__game!.snapshot().run?.trackId);
  // Fresh profile: 2 unlocked per collection in collection order.
  const unlocked = [
    "custom:birthday-cake-circuit",
    "custom:birthday-table-loop",
    "custom:tinsel-town",
    "custom:mistletoe-mile",
    "custom:dungeon",
    "haunted-hollow",
    "custom:block-party",
    "custom:toybox-road",
    "triple-loop",
    "custom:fairground",
    "foundry-run",
    "inferno-vault",
    "canyon-plunge",
    "sky-slide",
  ];
  await page.evaluate(() => {
    const g = window.__game!;
    g.pause(true);
    g.startTrack("triple-loop");
  });
  await expect.poll(trackId, { timeout: 15000 }).toBe("triple-loop");
  // N from Stunt 01 crosses into Stunt 02, then Industrial 01 (locked
  // ring-chase is skipped).
  await page.keyboard.press("n");
  await expect.poll(trackId, { timeout: 15000 }).toBe("custom:fairground");
  await page.keyboard.press("n");
  await expect.poll(trackId, { timeout: 15000 }).toBe("foundry-run");
  await page.keyboard.press("p");
  await expect.poll(trackId, { timeout: 15000 }).toBe("custom:fairground");
  await page.keyboard.press("p");
  await expect.poll(trackId, { timeout: 15000 }).toBe("triple-loop");
  // Full forward loop from the start, then backward, with wraparound.
  await page.evaluate(() => {
    window.__game!.startTrack("custom:birthday-cake-circuit");
  });
  await expect.poll(trackId, { timeout: 15000 }).toBe(
    "custom:birthday-cake-circuit",
  );
  for (const id of [...unlocked.slice(1), unlocked[0]]) {
    await page.keyboard.press("n");
    await expect.poll(trackId, { timeout: 15000 }).toBe(id);
  }
  for (const id of [
    unlocked.at(-1),
    ...unlocked.slice(1, -1).reverse(),
    unlocked[0],
  ]) {
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
    page.getByRole("heading", { name: "Choose your collection.", exact: true }),
  ).toBeVisible();
});

test("L returns to the current track's collection from an active run", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => {
    const g = window.__game!;
    g.pause(true);
    g.startTrack("foundry-run");
  });
  await expect(page.locator("#level-select")).toBeHidden();
  await page.keyboard.press("l");
  await expect(page.locator("#level-select")).toBeVisible();
  await expect(page.locator("#collection-title")).toHaveText(
    "Industrial Mayhem",
  );
  await expect(
    page.locator('[data-track="foundry-run"] .track-play'),
  ).toBeFocused();
});
