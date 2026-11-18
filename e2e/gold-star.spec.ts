import { test, expect, type Page } from "@playwright/test";

test.slow();

const TRACK = "foundry-run" as const;

/** Steer off the spawn line toward the star until it banks. */
async function collectStar(page: Page) {
  return page.evaluate((track) => {
    const g = window.__game!;
    const star = g.track(track).goldStars![0];
    for (let f = 0; f < 1200; f++) {
      const s = g.snapshot();
      const desired = Math.atan2(
        star.x - s.position.x,
        star.z - s.position.z,
      );
      const heading = Math.atan2(s.forward[0], s.forward[2]);
      const error = Math.atan2(
        Math.sin(desired - heading),
        Math.cos(desired - heading),
      );
      g.advanceFrames(1, 1, {
        throttle: 1,
        steer: Math.max(-1, Math.min(1, error * 2)),
      });
      if ((g.snapshot().run?.stars.length ?? 0) > 0) break;
    }
    return g.snapshot().run;
  }, TRACK);
}

async function startRace(page: Page) {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate((track) => {
    const g = window.__game!;
    g.startTrack(track);
    g.pause(true);
  }, TRACK);
}

test("gold star collects with a gold triple-count celebration", async ({
  page,
}) => {
  await startRace(page);
  const star = await page.evaluate(
    (track) => window.__game!.track(track).goldStars,
    TRACK,
  );
  expect(star?.length).toBe(1);
  // Let the course view build, then capture the chrome star pre-collect.
  await page.evaluate(() => window.__game!.advanceFrames(2, 1, {}));
  expect(
    await page.evaluate(() => window.__game!.stats().officialCourse.stars),
  ).toBe(1);
  await page.screenshot({ path: "test-results/gold-star-model.png" });

  const run = await collectStar(page);
  expect(run?.stars).toEqual(["gold-star-1"]);
  // Let the burst develop mid-flight; sim time freezes it for the shot.
  await page.evaluate(() => window.__game!.advanceFrames(30, 1, {}));
  await expect(page.locator("#checkpoint-banner")).toBeVisible();
  await expect(page.locator("#checkpoint-banner")).toHaveCSS("opacity", "1");
  await expect(page.locator("#checkpoint-banner strong")).toHaveText(
    "GOLD STAR!",
  );
  await expect(page.locator("#checkpoint-banner")).toHaveClass(/gold/);
  await expect(page.locator("#confetti")).toHaveAttribute("data-bursts", "1");
  await expect(page.locator("#confetti")).toHaveAttribute(
    "data-last-count",
    "420",
  );
  await expect(page.locator("#confetti")).toHaveAttribute(
    "data-last-color",
    "#ffd700",
  );
  await page.screenshot({ path: "test-results/gold-star-collect.png" });
  // The star hides once banked and persists across sessions.
  expect(
    await page.evaluate(() => window.__game!.stats().officialCourse.stars),
  ).toBe(0);
  expect(
    await page.evaluate(() =>
      JSON.parse(
        localStorage.getItem("iron-flight-gold-stars-v1") ?? "null",
      ),
    ),
  ).toEqual({ version: 1, banked: { [TRACK]: ["gold-star-1"] } });
});

test("level select shows banked and unbanked star states", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  const card = page.locator('.track-card[data-track="foundry-run"]');
  await expect(card.locator(".star-unlit")).toHaveCount(1);
  await expect(card.locator(".star-lit")).toHaveCount(0);
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/gold-star-select-unlit.png" });

  await page.evaluate(() =>
    localStorage.setItem(
      "iron-flight-gold-stars-v1",
      JSON.stringify({
        version: 1,
        banked: { "foundry-run": ["gold-star-1"] },
      }),
    ),
  );
  await page.reload();
  await page.waitForFunction(() => !!window.__game);
  const relit = page.locator('.track-card[data-track="foundry-run"]');
  await expect(relit.locator(".star-lit")).toHaveCount(1);
  await expect(relit.locator(".star-unlit")).toHaveCount(0);
  await relit.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/gold-star-select-lit.png" });
});
