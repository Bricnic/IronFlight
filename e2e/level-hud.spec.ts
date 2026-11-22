import { test, expect } from "@playwright/test";
import { blankLevel } from "../src/custom-level";

test.slow();

test("playing shows a rotating road map and saved records, with no legacy Edit button", async ({
  page,
}, info) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "iron-flight-best-times-v1",
      JSON.stringify({
        version: 1,
        records: {
          "custom:bouncy-house:default": { time: 35.3, splits: [] },
          "triple-loop:easy": { time: 22.2, splits: [] },
          "triple-loop:hard": { time: 33.3, splits: [] },
        },
      }),
    ),
  );
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await expect(page.locator("#level-hud")).toBeHidden();
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  await page.evaluate(() => {
    const g = window.__game!;
    g.startTrack("custom:bouncy-house");
    g.pause(true);
    g.advanceFrames(2, 1, {});
  });
  await expect(page.locator("#level-hud")).toBeVisible();
  await expect(page.locator("#edit-toggle")).toBeHidden();
  await expect(page.locator("#placement-bar")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Edit", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator("#hud-best-time")).toHaveText("35.3s");
  await expect(page.locator("#hud-best-medal")).toHaveText("GOLD");
  await expect(page.locator("#hud-best-time")).toHaveAttribute(
    "data-medal",
    "gold",
  );
  await expect(page.locator("#hud-gold-star")).toHaveText("Not found");
  const before = await page
    .locator("#hud-minimap")
    .evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.evaluate(() => {
    const g = window.__game!;
    g.place(g.snapshot().position, Math.PI / 2);
    g.advanceFrames(0, 1, {});
  });
  const after = await page
    .locator("#hud-minimap")
    .evaluate((c: HTMLCanvasElement) => ({
      image: c.toDataURL(),
      yaw: Number(c.dataset.heading),
    }));
  expect(after.yaw).toBeCloseTo(Math.PI / 2);
  expect(after.image).not.toBe(before);
  await page.screenshot({ path: info.outputPath("hud-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.__game!.advanceFrames(0, 1, {}));
  const bounds = await page.locator("#level-hud").boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: info.outputPath("hud-mobile.png") });
  await page.evaluate(() => {
    const g = window.__game!;
    g.startTrack("triple-loop", "easy");
    g.pause(true);
    g.advanceFrames(0, 1, {});
  });
  await expect(page.locator("#level-hud")).toBeVisible();
  await expect(page.locator("#hud-best-time")).toHaveText("22.2s");
  await page.evaluate(() => {
    const g = window.__game!;
    g.startTrack("triple-loop", "hard");
    g.pause(true);
    g.advanceFrames(0, 1, {});
  });
  await expect(page.locator("#hud-best-time")).toHaveText("33.3s");
  await page.evaluate(() => {
    const g = window.__game!;
    g.startTrack("sky-slide");
    g.pause(true);
    g.advanceFrames(0, 1, {});
  });
  await expect(page.locator("#hud-best-time")).toHaveText("No time set");
  await expect(page.locator("#hud-best-medal")).toHaveText("UNRANKED");
  await page.getByRole("button", { name: "Select level", exact: true }).click();
  await page.evaluate(() => window.__game!.advanceFrames(0, 1, {}));
  await expect(page.locator("#level-hud")).toBeHidden();
});

test("gold-star HUD banks a pickup and stays found after retry and reload", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  await page.evaluate(() => {
    const g = window.__game!;
    g.startTrack("foundry-run");
    g.pause(true);
    g.advanceFrames(1, 1, {});
  });
  await expect(page.locator("#hud-gold-star")).toHaveText("Not found");
  await page.evaluate(() => {
    const g = window.__game!,
      star = g.track("foundry-run").goldStars![0];
    g.place(star, 0);
    g.advanceFrames(2, 1, {});
  });
  await expect(page.locator("#hud-gold-star")).toHaveText("Found");
  await page.evaluate(() => {
    const g = window.__game!;
    g.startTrack("foundry-run");
    g.pause(true);
    g.advanceFrames(1, 1, {});
  });
  expect(
    await page.evaluate(() => window.__game!.snapshot().run!.stars),
  ).toEqual([]);
  await expect(page.locator("#hud-gold-star")).toHaveText("Found");
  await page.reload();
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => {
    const g = window.__game!;
    g.startTrack("foundry-run");
    g.pause(true);
    g.advanceFrames(1, 1, {});
  });
  await expect(page.locator("#hud-gold-star")).toHaveText("Found");
  await page.screenshot({ path: info.outputPath("hud-star-banked.png") });
});

test("a completed attempt updates the HUD's best and medal on retry", async ({
  page,
}) => {
  await page.route("**/__levels", async (route) => {
    if (route.request().method() === "POST")
      await route.fulfill({ json: route.request().postDataJSON().level });
    else await route.continue();
  });
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  const level = blankLevel("HUD finish");
  level.spawn = { x: 0, y: 2.1, z: -12, yaw: 0 };
  level.checkpoints = [{ x: 0, z: 0, y: 2.6 }];
  level.prefabs = [{ id: "star", kind: "gold-star", x: 0, y: 2, z: 0 }];
  const elapsed = await page.evaluate(async (level) => {
    const g = window.__game!;
    await g.customLevels.save(level);
    g.startTrack("custom:hud-finish");
    g.pause(true);
    for (let i = 0; i < 600 && g.snapshot().run!.status === "running"; i++)
      g.driveFrames(1, 1, () => ({ throttle: 1 }), false);
    return g.snapshot().run!;
  }, level);
  expect(elapsed.status).toBe("completed");
  await page.evaluate(() => {
    const g = window.__game!;
    g.startTrack("custom:hud-finish");
    g.pause(true);
    g.advanceFrames(1, 1, {});
  });
  await expect(page.locator("#hud-best-time")).toHaveText(
    `${elapsed.elapsed.toFixed(1)}s`,
  );
  await expect(page.locator("#hud-best-medal")).toHaveText("GOLD");
  await expect(page.locator("#hud-gold-star")).toHaveText("Found");
});
