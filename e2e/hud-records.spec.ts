import { test, expect } from "@playwright/test";

test.slow();

const TRACK = "custom:shipyard" as const;
const OTHER = "custom:evil-tube-run" as const;

test("in-game HUD shows best time, medal, and gold-star state", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "iron-flight-best-times-v1",
      JSON.stringify({
        version: 1,
        records: { "custom:shipyard:default": { time: 40.2, splits: [] } },
      }),
    );
    localStorage.setItem(
      "iron-flight-gold-stars-v1",
      JSON.stringify({
        version: 1,
        banked: {
          "custom:shipyard": {
            "gold-star-1": {
              found: true,
              coords: { x: 93, y: 1.9, z: 70 },
            },
          },
        },
      }),
    );
  });
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate((track) => window.__game!.startTrack(track), TRACK);
  await expect(page.locator("#hud-best-time")).toHaveText("40.2s");
  await expect(page.locator("#hud-best-time")).toHaveClass(/gold/);
  await expect(page.locator("#hud-best-medal")).toHaveText("GOLD");
  await expect(page.locator("#hud-stars .star-lit")).toHaveCount(1);
  await expect(page.locator("#hud-stars .star-unlit")).toHaveCount(0);

  // Unseeded course: placeholders and an unlit star.
  await page.evaluate((track) => window.__game!.startTrack(track), OTHER);
  await expect(page.locator("#hud-best-time")).toHaveText("—");
  await expect(page.locator("#hud-best-time")).not.toHaveClass(
    /gold|silver|bronze/,
  );
  await expect(page.locator("#hud-best-medal")).toHaveText("UNRANKED");
  await expect(page.locator("#hud-stars .star-unlit")).toHaveCount(1);

  // Collecting mid-run lights the indicator live.
  await page.evaluate((track) => {
    const g = window.__game!;
    const star = g.track(track).goldStars![0];
    g.place({ x: star.x, y: star.y, z: star.z }, 0);
    for (let f = 0; f < 1200; f++) {
      const s = g.snapshot();
      const desired = Math.atan2(star.x - s.position.x, star.z - s.position.z);
      const heading = Math.atan2(s.forward[0], s.forward[2]);
      const error = Math.atan2(
        Math.sin(desired - heading),
        Math.cos(desired - heading),
      );
      g.driveFrames(
        1,
        1,
        () => ({
          throttle: 1,
          steer: Math.max(-1, Math.min(1, error * 2)),
        }),
        false,
      );
      if ((g.snapshot().run?.stars.length ?? 0) > 0) break;
    }
  }, OTHER);
  await expect(page.locator("#hud-stars .star-lit")).toHaveCount(1);
  await expect(page.locator("#hud-stars .star-unlit")).toHaveCount(0);
});
