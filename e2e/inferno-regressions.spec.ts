import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => {
    window.__game!.pause(true);
    window.__game!.startTrack("inferno-vault");
  });
});
test("Inferno flame jets burn the whole truck to zero, solely through fire", async ({
  page,
}, info) => {
  const s = await page.evaluate(() => {
    const g = window.__game!;
    g.place({ x: 0, y: 2.1, z: -50 }, 0);
    g.advanceFrames(120, 16, { brake: 1 });
    return g.snapshot();
  });
  expect(s.status).toBe("wrecked");
  expect(s.integrity).toBe(0);
  expect(s.fireDamageTaken + s.smolderDamageTaken).toBeCloseTo(1, 6);
  expect(s.hammerImpacts).toHaveLength(0);
  expect(Object.values(s.parts).every((p) => p.lava === null)).toBe(true);
  await info.attach("fire-only destruction", {
    body: JSON.stringify(s),
    contentType: "application/json",
  });
});
test("jets visibly grow and shrink over 500ms, and telemetry is fourteen point", async ({
  page,
}, info) => {
  await page.evaluate(() => window.__game!.place({ x: 10, y: 2.1, z: -58 }, 0));
  const jets = () =>
    page.evaluate(() => window.__game!.stats().officialCourse.jets);
  expect((await jets())[0].visible).toBe(false);
  await page.evaluate(() => window.__game!.advanceFrames(15, 1, {}));
  expect((await jets())[0].scale).toBeCloseTo(0.5);
  await page.screenshot({ path: info.outputPath("jet-growing.png") });
  await page.evaluate(() => window.__game!.advanceFrames(15, 1, {}));
  expect((await jets())[0].scale).toBeCloseTo(1);
  await page.evaluate(() => window.__game!.advanceFrames(165, 1, {}));
  expect((await jets())[0].scale).toBeCloseTo(0.5);
  await page.screenshot({
    path: info.outputPath("jet-shrinking-readable-hud.png"),
  });
  await page.evaluate(() => window.__game!.advanceFrames(15, 1, {}));
  expect((await jets())[0].visible).toBe(false);
  for (const selector of [".stats > span", ".stats b"]) {
    const sizes = await page
      .locator(selector)
      .evaluateAll((es) =>
        es.map((e) => parseFloat(getComputedStyle(e).fontSize)),
      );
    expect(sizes.every((s) => s >= 18.6 && s < 18.8)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page
      .locator(".stats")
      .evaluate((e) => e.scrollWidth <= e.clientWidth),
  ).toBe(true);
  await page.screenshot({ path: info.outputPath("fourteen-point-mobile.png") });
});
test("smoke remains visible and fades after leaving a flame jet", async ({
  page,
}, info) => {
  await page.evaluate(() => {
    const g = window.__game!;
    g.place({ x: 0, y: 2.1, z: -50 }, 0);
    g.advanceFrames(60, 1, {});
    g.place({ x: 100, y: 2.1, z: -100 }, 0);
    g.advanceFrames(6, 1, {});
  });
  const first = await page.evaluate(() => window.__game!.stats().fire);
  expect(first.smokeVisible).toBe(true);
  expect(first.smokeStrength).toBeGreaterThan(0.2);
  await page.evaluate(() => window.__game!.advanceFrames(90, 1, {}));
  const middle = await page.evaluate(() => window.__game!.stats().fire);
  expect(middle.smokeStrength).toBeGreaterThan(0);
  expect(middle.smokeStrength).toBeLessThan(first.smokeStrength);
  await page.screenshot({ path: info.outputPath("lingering-smoke.png") });
  await page.evaluate(() => window.__game!.advanceFrames(120, 1, {}));
  expect(
    await page.evaluate(() => window.__game!.stats().fire.smokeVisible),
  ).toBe(false);
});
test("a truck falls into the recessed lava pit before its parts contact lava", async ({
  page,
}, info) => {
  await page.evaluate(() => {
    const g = window.__game!;
    g.place({ x: -25, y: 2.1, z: 20 }, 0);
    g.advanceFrames(24, 1, {});
  });
  const falling = await page.evaluate(() => window.__game!.snapshot());
  expect(falling.position.y).toBeLessThan(1);
  expect(falling.parts["chassis-front"].lava).toBeNull();
  await page.evaluate(() => window.__game!.lavaOverview());
  await page.screenshot({ path: info.outputPath("inferno-deep-pit.png") });
  await page.evaluate(() => window.__game!.advanceFrames(60, 1, {}));
  const contact = await page.evaluate(() => window.__game!.snapshot());
  expect(contact.parts["chassis-front"].lava).not.toBeNull();
  expect(contact.parts["chassis-front"].lava!.surface).toBeLessThan(-3);
});
