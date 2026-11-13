import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 800, height: 450 } });

test("objective stack clears the telemetry panel at 800px", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => {
    const g = window.__game!;
    g.startTrack("haunted-hollow");
    g.pause(true);
  });
  await expect(page.locator("#state-copy")).not.toBeEmpty();
  const status = await page.locator("#status").boundingBox();
  const tele = await page.locator("#telemetry").boundingBox();
  expect(status).not.toBeNull();
  expect(tele).not.toBeNull();
  expect(status!.x + status!.width).toBeLessThanOrEqual(tele!.x);
});
