import { test, expect } from "@playwright/test";

test.slow();

test("settings from a course returns to pause and resumes progress", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("iron-flight-settings-v1", JSON.stringify({ video: "low" }));
  });
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => window.__game!.startTrack("foundry-run"));
  await page.evaluate(() => window.__game!.advanceFrames(120, 1, { throttle: 1 }));
  await page.evaluate(() => window.__game!.advanceFrames(180, 1, { brake: 1 }));
  const before = await page.evaluate(() => {
    const s = window.__game!.snapshot();
    return {
      elapsed: s.run!.elapsed,
      status: s.run!.status,
      checkpoint: s.run!.checkpoint,
      x: s.position.x,
      z: s.position.z,
    };
  });
  expect(before.status).toBe("running");
  expect(before.elapsed).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.locator("#settings-screen")).toBeVisible();
  await page.locator("#settings-back").click();
  await expect(page.locator("#pause-menu")).toBeVisible();
  await page.locator("#pause-resume").click();
  await expect(page.locator("#pause-menu")).toBeHidden();
  // Freeze immediately: the live loop coasts the car once resumed.
  await page.evaluate(() => window.__game!.pause(true));
  const after = await page.evaluate(() => {
    const s = window.__game!.snapshot();
    return {
      elapsed: s.run!.elapsed,
      status: s.run!.status,
      checkpoint: s.run!.checkpoint,
      x: s.position.x,
      z: s.position.z,
    };
  });
  expect(after.status).toBe("running");
  expect(after.checkpoint).toBe(before.checkpoint);
  expect(after.elapsed).toBeGreaterThanOrEqual(before.elapsed);
  expect(after.x).toBeCloseTo(before.x, -1);
  expect(after.z).toBeCloseTo(before.z, -1);
});
