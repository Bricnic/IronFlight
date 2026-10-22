import { test, expect } from "@playwright/test";
test("off-road grass, grandstand steps and lava have real collision", async ({
  page,
}, info) => {
  await page.goto("/?test=1");
  await page.waitForFunction(() => !!window.__game);
  const offroad = await page.evaluate(() => {
    const g = window.__game!;
    g.select("easy");
    g.pause(true);
    g.place({ x: -24, y: 2.1, z: -65 }, Math.PI / 2);
    g.advanceFrames(120, 1, { throttle: 1 });
    return g.snapshot();
  });
  expect(offroad.surfaces).toContain("grass");
  expect(offroad.position.y).toBeGreaterThan(1);
  expect(offroad.position.x).toBeGreaterThan(-18);
  expect(offroad.status).toBe("driving");
  const stand = await page.evaluate(() => {
    const g = window.__game!;
    g.select("hard");
    g.place({ x: 48, y: 2.1, z: -65 }, Math.PI / 2);
    g.advanceFrames(240, 1, { throttle: 1 });
    return g.snapshot();
  });
  expect(stand.surfaces).toContain("grandstand");
  expect(stand.position.x).toBeLessThan(87);
  expect(stand.position.y).toBeGreaterThan(0);
  await page.screenshot({ path: info.outputPath("grandstand-contact.png") });
  const lava = await page.evaluate(() => {
    const g = window.__game!;
    g.select("easy");
    g.place({ x: -24, y: -3, z: 20 }, 0);
    g.advanceFrames(180, 1, {});
    return g.snapshot();
  });
  expect(lava.damageEvents.some((e) => e.source === "lava")).toBe(true);
  expect(lava.parts["chassis-front"].position!.y).toBeGreaterThan(-8);
});
