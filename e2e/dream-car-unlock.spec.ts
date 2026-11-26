import { test, expect } from "@playwright/test";

test.slow();

const DREAM = "custom:sweet-celebrations-dream";
const CAR = "cake-cruiser";

test("dream car locks until its dream has gold and star, then unlocks", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.locator("#vehicle-select-button").click();
  const card = page.locator(`.vehicle-card[data-vehicle="${CAR}"]`);
  await expect(card).toBeVisible();
  await expect(card.locator(".play-word")).toHaveText("LOCKED");
  await card.scrollIntoViewIfNeeded();
  await card.locator("button").click({ force: true });
  await expect(page.locator("#vehicle-lock-toast")).toContainText(
    "gold medal and find the gold star",
  );
  await expect(page.locator("#vehicle-lock-toast")).toContainText(
    "Sweet Celebrations Dream",
  );

  // Bank a dream gold (1s beats the threshold) and the dream star, reload.
  await page.evaluate(() => {
    const g = window.__game!;
    const star = g.track("custom:sweet-celebrations-dream" as never).goldStars![0];
    localStorage.setItem(
      "iron-flight-best-times-v1",
      JSON.stringify({
        version: 1,
        records: { "custom:sweet-celebrations-dream:default": { time: 1, splits: [] } },
      }),
    );
    localStorage.setItem(
      "iron-flight-gold-stars-v1",
      JSON.stringify({
        version: 1,
        banked: {
          "custom:sweet-celebrations-dream": {
            [star.id]: { found: true, coords: { x: star.x, y: star.y, z: star.z } },
          },
        },
      }),
    );
  });
  await page.reload();
  await page.waitForFunction(() => !!window.__game);
  await page.locator("#vehicle-select-button").click();
  const open = page.locator(`.vehicle-card[data-vehicle="${CAR}"]`);
  await expect(open.locator(".play-word")).toHaveText("DRIVE ↗", { timeout: 15000 });
  await open.locator("button").click();
  await expect(page.locator("#level-select")).toBeVisible();
});

