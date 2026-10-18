import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/?test=1");
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => {
    window.__game!.select("lab");
    window.__game!.pause(true);
  });
});
test("A steers left and D steers right using real keyboard events", async ({
  page,
}) => {
  for (const [key, sign] of [
    ["a", 1],
    ["d", -1],
  ] as const) {
    await page.evaluate(() => window.__game!.select("lab"));
    await page.keyboard.down("w");
    await page.evaluate(() => window.__game!.advanceFrames(120, 1));
    await page.keyboard.down(key);
    await page.evaluate(() => window.__game!.advanceFrames(48, 1));
    const s = await page.evaluate(() => window.__game!.snapshot());
    expect(s.position.x * sign).toBeGreaterThan(0.2);
    await page.keyboard.up(key);
    await page.keyboard.up("w");
  }
});
test("S brakes smoothly then reverses; Space does not reverse", async ({
  page,
}) => {
  await page.keyboard.down("w");
  await page.evaluate(() => window.__game!.advanceFrames(180, 1));
  await page.keyboard.up("w");
  const before = await page.evaluate(() => window.__game!.snapshot().speed);
  await page.keyboard.down("s");
  await page.evaluate(() => window.__game!.advanceFrames(15, 1));
  const braking = await page.evaluate(() => window.__game!.snapshot());
  expect(before - braking.speed).toBeLessThan(2);
  expect(braking.upDot).toBeGreaterThan(0.9);
  await page.evaluate(() => window.__game!.advanceFrames(360, 1));
  expect(
    await page.evaluate(() => window.__game!.snapshot().signedSpeed),
  ).toBeLessThan(-1);
  await page.keyboard.up("s");
  await page.evaluate(() => window.__game!.select("lab"));
  await page.keyboard.down(" ");
  await page.evaluate(() => window.__game!.advanceFrames(180, 1));
  expect(
    Math.abs(await page.evaluate(() => window.__game!.snapshot().signedSpeed)),
  ).toBeLessThan(0.1);
  await page.keyboard.up(" ");
});
test("all finish lines leave the truck upright and driving normally", async ({
  page,
}) => {
  for (const stage of ["easy", "medium", "hard"] as const) {
    const states = await page.evaluate((stage) => {
      const g = window.__game!;
      g.select(stage);
      g.advanceFrames(600, 1, { throttle: 1 });
      const states = [g.snapshot()];
      for (let i = 0; i < 3; i++) {
        g.advanceFrames(60, 1, { throttle: 1 });
        states.push(g.snapshot());
      }
      return states;
    }, stage);
    expect(states.some((s) => s.status === "finished")).toBe(true);
    for (const s of states) expect(s.upDot).toBeGreaterThan(0.85);
  }
});
