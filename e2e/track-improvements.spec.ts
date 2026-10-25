import { test, expect } from "@playwright/test";
// The sinking-chassis camera soak exceeds the default 90s under SwiftShader.
test.slow();
test("arrow keys navigate the responsive level grid, Space plays, and L returns", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  const cards = page.locator(".track-play");
  await expect(cards.nth(0)).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(cards.nth(1)).toBeFocused();
  const columns = await page
    .locator("#level-select .track-grid")
    .evaluate((e) => getComputedStyle(e).gridTemplateColumns.split(" ").length);
  await page.keyboard.press("ArrowDown");
  await expect(cards.nth(1 + columns)).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(cards.nth(1)).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(cards.nth(0)).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  await expect(page.locator("#level-select")).toBeHidden();
  expect(
    await page.evaluate(() => window.__game!.snapshot().run?.trackId),
  ).toBe("harbor-sprint");
  await page.keyboard.press("l");
  await expect(page.locator("#level-select")).toBeVisible();
  await expect(cards.nth(1)).toBeFocused();
});

test("level speed sliders expose their defaults and ranges and persist adjustments", async ({
  page,
}) => {
  await page.goto("/?test=track-tuning");
  await page.waitForFunction(() => !!window.__game);
  await page.keyboard.press("Backquote");
  const water = page.locator("#tune-slideWaterSpeed");
  await expect(water).toHaveValue("2.5");
  await expect(water).toHaveAttribute("min", "1");
  await expect(water).toHaveAttribute("max", "10");
  await expect(page.locator("#value-slideWaterSpeed")).toContainText("250 MPH");
  await water.fill("10");
  await water.dispatchEvent("input");
  await expect(page.locator("#value-slideWaterSpeed")).toContainText(
    "1000 MPH",
  );
  await page.locator("#tune-canyonTopSpeed").fill("2");
  await page.locator("#tune-canyonTopSpeed").dispatchEvent("input");
  await page.reload();
  await page.waitForFunction(() => !!window.__game);
  expect(
    await page.evaluate(() => window.__game!.snapshot().tuning),
  ).toMatchObject({ slideWaterSpeed: 10, canyonTopSpeed: 2 });
});

test("Inferno's camera stays above the stage while the chassis sinks", async ({
  page,
}, info) => {
  await page.goto("/?test=inferno-camera");
  await page.waitForFunction(() => !!window.__game);
  const samples = await page.evaluate(() => {
    const g = window.__game!;
    g.pause(true);
    g.startTrack("inferno-vault");
    g.place({ x: -25, y: -3.8, z: 20 }, 0);
    const samples = [];
    for (let i = 0; i < 90; i++) {
      g.advanceFrames(1, 1, {});
      const s = g.snapshot();
      if (s.parts["chassis-front"].lava)
        samples.push({
          camera: g.camera().position,
          chassis: s.parts["chassis-front"],
          speed: s.speed,
        });
    }
    return samples;
  });
  expect(samples.length).toBeGreaterThan(30);
  for (const s of samples) {
    expect(s.camera.y).toBeGreaterThanOrEqual(8);
    for (const v of [...Object.values(s.camera), s.speed])
      expect(Number.isFinite(v)).toBe(true);
  }
  expect(samples.at(-1)!.chassis.position!.y).toBeLessThan(-4);
  await page.screenshot({
    path: info.outputPath("inferno-sinking-camera.png"),
  });
});
