import { test, expect, type Page } from "@playwright/test";

test.slow();

// Stunt Parks is the smallest gate: three courses, one star each. Seed golds
// everywhere plus two of the three stars, then collect fairground's star live
// (relocated, so only a live collect banks exact coords) to flip the dream open.
const TRACK = "custom:fairground" as const;

async function startSeededRace(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "iron-flight-best-times-v1",
      JSON.stringify({
        version: 1,
        records: {
          "triple-loop:easy": 30,
          "custom:fairground:default": 200,
          "custom:ring-chase:default": 60,
        },
      }),
    );
    localStorage.setItem(
      "iron-flight-gold-stars-v1",
      JSON.stringify({
        version: 1,
        banked: {
          "triple-loop": { "gold-star-1": { found: true } },
          "custom:ring-chase": { "gold-star-1": { found: true } },
        },
      }),
    );
  });
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate((track) => {
    const g = window.__game!;
    g.startTrack(track);
    g.pause(true);
  }, TRACK);
}

/** Place the truck on the star and drive until it banks. */
async function collectStar(page: Page) {
  return page.evaluate((track) => {
    const g = window.__game!;
    const star = g.track(track).goldStars![0];
    g.place({ x: star.x, y: star.y, z: star.z }, 0);
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
      g.driveFrames(1, 1, () => ({
        throttle: 1,
        steer: Math.max(-1, Math.min(1, error * 2)),
      }), false);
      if ((g.snapshot().run?.stars.length ?? 0) > 0) break;
    }
    return g.snapshot().run;
  }, TRACK);
}

test("final gold star unlocks the dream level with a celebration banner", async ({
  page,
}) => {
  await startSeededRace(page);
  const run = await collectStar(page);
  expect(run?.stars).toEqual(["gold-star-1"]);
  await page.evaluate(() => window.__game!.advanceFrames(30, 1, {}));
  await expect(page.locator("#checkpoint-banner")).toBeVisible();
  await expect(page.locator("#checkpoint-banner strong")).toHaveText(
    "DREAM LEVEL UNLOCKED!",
  );
  await expect(page.locator("#checkpoint-delta")).toBeVisible();
  await expect(page.locator("#checkpoint-delta")).toHaveText(
    "Stunt Parks Dream",
  );
  await expect(page.locator("#checkpoint-banner")).toHaveClass(/gold/);
  // The usual gold confetti still fires, doubled for the occasion.
  await expect(page.locator("#confetti")).toHaveAttribute("data-bursts", "1");
  await expect(page.locator("#confetti")).toHaveAttribute(
    "data-last-count",
    "840",
  );
  await expect(page.locator("#confetti")).toHaveAttribute(
    "data-last-color",
    "#ffd700",
  );
});
