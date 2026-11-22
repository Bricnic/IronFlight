import { test, expect } from "@playwright/test";

test.slow();

// Headless Chromium has no WebXR, so the VR entry stays hidden and the game
// must boot and drive exactly as before the setAnimationLoop switch.
test("vr entry hides without WebXR and desktop driving is unaffected", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await expect(page.locator("#vr-button")).toBeHidden();
  await page.evaluate(() => {
    const g = window.__game!;
    g.startTrack("triple-loop");
    g.pause(false);
  });
  await page.evaluate(() => window.__game!.driveFrames(120, 1, () => ({ throttle: 1, steer: 0, brake: 0 }), false));
  const run = await page.evaluate(() => window.__game!.snapshot().run);
  expect(run?.status).toBe("running");
  expect(run?.checkpoint ?? 0).toBeGreaterThanOrEqual(0);
  expect(errors).toEqual([]);
});
