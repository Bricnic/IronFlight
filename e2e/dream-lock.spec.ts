import { test, expect } from "@playwright/test";

test.slow();

const DREAM = "custom:sweet-celebrations-dream";

test("dream level unlocks only with gold medals and stars on every course", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.locator('[data-collection="sweet-celebrations"] button').click();
  const dream = page.locator(`.track-card[data-track="${DREAM}"]`);
  await expect(dream).toBeVisible();
  await expect(dream.locator(".play-word")).toHaveText("LOCKED");
  // Locked cards carry aria-disabled (they answer with a shake instead of
  // starting), so bypass actionability checks for the toast probe.
  await dream.scrollIntoViewIfNeeded();
  await dream.locator("button").click({ force: true });
  await expect(page.locator("#lock-toast")).toContainText(
    "gold medal and find the gold star",
  );

  // Bank golds (1s beats every threshold) and exact-coord stars for all
  // eight Sweet Celebrations courses, then reload so records rehydrate.
  await page.evaluate(() => {
    const g = window.__game!;
    const records: Record<string, { time: number; splits: number[] }> = {};
    const banked: Record<string, Record<string, { found: true; coords: { x: number; y: number; z: number } }>> = {};
    for (const id of [
      "custom:birthday-cake-circuit",
      "custom:birthday-table-loop",
      "custom:bouncy-house",
      "custom:gumdrop-meadows",
      "custom:lollipop-loop",
      "custom:peppermint-pass",
      "custom:chocolate-chasm",
      "custom:sugar-rush-summit",
    ]) {
      records[`${id}:default`] = { time: 1, splits: [] };
      const star = g.track(id as never).goldStars![0];
      banked[id] = {
        [star.id]: {
          found: true,
          coords: { x: star.x, y: star.y, z: star.z },
        },
      };
    }
    localStorage.setItem(
      "iron-flight-best-times-v1",
      JSON.stringify({ version: 1, records }),
    );
    localStorage.setItem(
      "iron-flight-gold-stars-v1",
      JSON.stringify({ version: 1, banked }),
    );
  });
  await page.reload();
  await page.waitForFunction(() => !!window.__game);
  await page.locator('[data-collection="sweet-celebrations"] button').click();
  const open = page.locator(`.track-card[data-track="${DREAM}"]`);
  await expect(open.locator(".play-word")).toHaveText("PLAY ↗");
  await open.locator("button").click();
  await expect(page.locator("#run-progress")).toBeVisible();
});
