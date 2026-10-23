import { test, expect } from "@playwright/test";
test("flames char the exterior; smoke follows the five-second capped afterburn", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/?test=fire-smolder");
  await page.waitForFunction(() => !!window.__game);
  const clean = await page.evaluate(() => {
    const g = window.__game!;
    g.pause(true);
    g.select("easy");
    g.setTuning({ dragonDamage: 1 });
    return g.stats().fire;
  });
  await page.evaluate(() => {
    const g = window.__game!;
    g.place({ x: -24, y: 2, z: 213 }, 0);
    g.advanceFrames(102, 1, {});
    g.place({ x: -24, y: 2, z: 120 }, 0);
  });
  const burning = await page.evaluate(() => ({
    state: window.__game!.snapshot(),
    art: window.__game!.stats().fire,
  }));
  expect(burning.state.fireDamageTaken).toBeGreaterThan(0.5);
  expect(burning.state.smolderRemaining).toBeGreaterThan(0.23);
  expect(burning.art.smokeVisible).toBe(true);
  expect(burning.art.smokeParticles).toBe(48);
  expect(burning.art.paintColor![0]).toBeLessThan(clean.paintColor![0]);
  await page.screenshot({ path: "artifacts/truck-smolder.png" });
  await page.evaluate(() => window.__game!.advanceFrames(60, 1, {}));
  const one = await page.evaluate(() => window.__game!.snapshot());
  expect(burning.state.integrity - one.integrity).toBeCloseTo(0.05, 5);
  expect(one.smoking).toBe(true);
  await page.screenshot({ path: "artifacts/truck-smolder.png" });
  await page.evaluate(() => window.__game!.advanceFrames(300, 1, {}));
  const ended = await page.evaluate(() => ({
    state: window.__game!.snapshot(),
    art: window.__game!.stats().fire,
  }));
  expect(ended.state.smolderDamageTaken).toBeCloseTo(0.25, 6);
  expect(ended.state.smolderRemaining).toBe(0);
  expect(ended.art.smokeVisible).toBe(true);
  expect(ended.art.smokeStrength).toBeGreaterThan(0);
  expect(ended.art.smokeStrength).toBeLessThan(0.22);
  await page.evaluate(() => window.__game!.advanceFrames(180, 1, {}));
  expect(
    await page.evaluate(() => window.__game!.stats().fire.smokeVisible),
  ).toBe(false);
  expect(ended.art.paintColor![0]).toBeLessThan(burning.art.paintColor![0]);
  await page.screenshot({ path: "artifacts/truck-charred.png" });
  await page.evaluate(() => window.__game!.advanceFrames(120, 1, {}));
  expect(
    await page.evaluate(() => window.__game!.snapshot().integrity),
  ).toBeCloseTo(ended.state.integrity, 6);
  await page.evaluate(() => window.__game!.select("easy"));
  expect(
    await page.evaluate(() => window.__game!.stats().fire.paintColor),
  ).toEqual(clean.paintColor);
  await info.attach("fire-telemetry", {
    body: JSON.stringify({ burning, ended }),
    contentType: "application/json",
  });
  expect(errors).toEqual([]);
});
