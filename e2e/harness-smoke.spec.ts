import { test, expect } from "@playwright/test";

for (const id of ["custom:amber-undertow", "custom:fireside-sonata"]) {
  test(`advanceFrames harness runs on ${id}`, async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => !!window.__game);
    const snap = await page.evaluate((t) => {
      const g = window.__game!;
      g.startTrack(t as "custom:amber-undertow");
      g.pause(false);
      g.advanceFrames(25, 1, {});
      g.pause(true);
      return g.snapshot(false);
    }, id);
    expect(snap.integrity).toBeGreaterThan(0);
  });
}
