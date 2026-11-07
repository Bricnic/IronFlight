import { test, expect } from "@playwright/test";
test("G toggles graveyard ghosts live and syncs the saved checkbox setting", async ({
  page,
}) => {
  await page.goto("/?test=ghost-toggle");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => {
    const g = window.__game!;
    g.pause(true);
    g.startTrack("haunted-hollow");
  });
  await page.keyboard.press("Backquote");
  const toggle = page.getByRole("checkbox", {
    name: "Enable graveyard ghosts",
  });
  await expect(toggle).toBeChecked();
  await page.keyboard.down("g");
  await page.keyboard.down("g");
  await page.keyboard.up("g");
  await expect(toggle).not.toBeChecked();
  const frozen = await page.evaluate(() => {
    const g = window.__game!;
    g.advanceFrames(1, 1, {});
    return g.snapshot().ghosts.ghosts;
  });
  const after = await page.evaluate(() => {
    const g = window.__game!;
    g.advanceFrames(120, 1, {});
    return { state: g.snapshot(), ghosts: g.stats().officialCourse.ghosts };
  });
  expect(after.state.ghosts.ghosts).toEqual(frozen);
  expect(after.state.integrity).toBe(1);
  expect(after.ghosts).toBe(0);
  await page.reload();
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => {
    const g = window.__game!;
    g.pause(true);
    g.startTrack("haunted-hollow");
  });
  await page.keyboard.press("Backquote");
  await expect(toggle).not.toBeChecked();
  expect(
    await page.evaluate(() => window.__game!.stats().officialCourse.ghosts),
  ).toBe(0);
  await page.keyboard.press("g");
  await expect(toggle).toBeChecked();
  await page.evaluate(() => window.__game!.advanceFrames(1, 1, {}));
  expect(
    await page.evaluate(() => window.__game!.stats().officialCourse.ghosts),
  ).toBe(3);
  expect(
    await page.evaluate(() => window.__game!.snapshot().ghosts.enabled),
  ).toBe(true);
  await toggle.uncheck();
  expect(
    await page.evaluate(() => window.__game!.snapshot().ghosts.enabled),
  ).toBe(false);
});
