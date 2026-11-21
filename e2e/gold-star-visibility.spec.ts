import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { TRACK_IDS } from "../src/tracks";
import { customSlug } from "../src/custom-level";

/**
 * Gold-star spawn-visibility sweep: every track (8 legacy + 39 official)
 * must hide its star from the spawn camera.
 *
 * The probe (window.__game.starHiddenFromSpawn) loads the track, settles
 * ~1s, and reports hidden=true iff the star is outside the spawn-camera
 * frustum OR occluded (three.js raycast vs solid level geometry) OR
 * farther than 150u (STAR_RECOGNITION_RANGE). See
 * docs/gold-star-relocation.md for the exact rule.
 *
 * Filter to one track for later stages with:
 *   npx playwright test gold-star-visibility -g <track-id>
 */
test.slow();

const order = JSON.parse(
  readFileSync("levels/official/order.json", "utf8"),
) as { file: string }[];
const officialIds = order.map(({ file }) => {
  const level = JSON.parse(
    readFileSync(`levels${file}`, "utf8"),
  ) as { name: string };
  return `custom:${customSlug(level.name)}`;
});
const TRACK_LIST = [...TRACK_IDS, ...officialIds];

test("covers all 47 tracks", async () => {
  expect(TRACK_IDS).toHaveLength(8);
  expect(officialIds).toHaveLength(39);
  expect(new Set(TRACK_LIST).size).toBe(47);
});

for (const id of TRACK_LIST) {
  test(`gold star hidden from spawn: ${id}`, async ({ page }) => {
    // Bouncy House is frozen by user order: its star is spawn-visible kept as-is.
    test.skip(
      id === "custom:bouncy-house",
      "frozen star, spawn-visible by design",
    );
    await page.goto("/");
    await page.waitForFunction(() => !!window.__game);
    const result = await page.evaluate(
      (trackId) => window.__game!.starHiddenFromSpawn(trackId),
      id,
    );
    await page.screenshot({
      path: `test-results/gold-star-spawn-${id.replaceAll(":", "-")}.png`,
    });
    expect(
      result.hidden,
      `${id}: star spawn-visible ${JSON.stringify(result)}`,
    ).toBe(true);
  });
}
